import { adminServices } from '@/lib/server/firebase';
import { authenticate, failure, rateLimit, readBody } from '@/lib/server/http';
import { applyCommand, assertRoomId, SessionError } from '@/lib/session';
export const runtime = 'nodejs';
export async function POST(request, { params }) {
  try {
    const actor = await authenticate(request);
    const { islandId } = await params;
    assertRoomId(islandId);
    const command = await readBody(request);
    if (typeof command.commandId !== 'string' || !/^[a-zA-Z0-9-]{10,80}$/.test(command.commandId))
      throw new SessionError('操作識別碼不正確。');
    await rateLimit(actor.uid, 'command', 120);
    const { db } = adminServices();
    const roomRef = db.doc(`islands/${islandId}`);
    if (command.type === 'lease') {
      const current = await roomRef.get();
      if (!current.exists || !current.data().memberUids?.includes(actor.uid))
        throw new SessionError('請先加入這座島嶼。', 403);
      const data = current.data();
      const patch = applyCommand(data, command, actor);
      if (Object.keys(patch).length) {
        try {
          await roomRef.update(patch, { lastUpdateTime: current.updateTime });
        } catch (error) {
          if (![9, 10].includes(error.code)) throw error;
        }
      }
      return Response.json({ version: data.version });
    }
    const result = await db.runTransaction(
      async (transaction) => {
        const [room, previous] = await transaction.getAll(
          roomRef,
          roomRef.collection('commands').doc(command.commandId),
        );
        if (!room.exists) throw new SessionError('島嶼不存在。', 404);
        if (!room.data().memberUids?.includes(actor.uid))
          throw new SessionError('請先加入這座島嶼。', 403);
        if (room.data().schemaVersion !== 2) throw new SessionError('這座島嶼需要更新。', 409);
        if (previous.exists) {
          if (previous.data().uid !== actor.uid)
            throw new SessionError('操作識別碼已被使用。', 409);
          return { version: previous.data().version };
        }
        const patch = applyCommand(room.data(), command, actor);
        const version = patch.version ?? room.data().version;
        if (Object.keys(patch).length) transaction.update(roomRef, patch);
        if (command.type !== 'lease')
          transaction.create(roomRef.collection('commands').doc(command.commandId), {
            uid: actor.uid,
            version,
            createdAt: Date.now(),
          });
        return { version };
      },
      { maxAttempts: 10 },
    );
    return Response.json(result);
  } catch (error) {
    return failure(error);
  }
}
