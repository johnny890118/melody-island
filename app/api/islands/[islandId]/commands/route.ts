import { parseCommand, record } from '@/lib/validation';
import { errorCode } from '@/lib/errors';
import type { RouteContext } from '@/lib/types';
import { requireRoom } from '@/lib/server/room';
import { adminServices } from '@/lib/server/firebase';
import { authenticate, failure, rateLimit, readBody } from '@/lib/server/http';
import { applyCommand, assertRoomId, SessionError } from '@/lib/session';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const actor = await authenticate(request);
    const { islandId } = await params;
    assertRoomId(islandId);
    const command = parseCommand(await readBody(request));
    const commandId = command.commandId;
    if (typeof commandId !== 'string' || !/^[a-zA-Z0-9-]{10,80}$/.test(commandId))
      throw new SessionError('操作識別碼不正確。');
    await rateLimit(actor.uid, 'command', 120);
    const { db } = adminServices();
    const roomRef = db.doc(`islands/${islandId}`);
    if (command.type === 'lease') {
      const current = await roomRef.get();
      const data = requireRoom(current);
      if (!data.memberUids.includes(actor.uid)) throw new SessionError('請先加入這座島嶼。', 403);
      const patch = applyCommand(data, command, actor);
      if (Object.keys(patch).length) {
        try {
          await roomRef.update(patch, { lastUpdateTime: current.updateTime });
        } catch (error) {
          if (![9, 10].some((code) => code === errorCode(error))) throw error;
        }
      }
      return Response.json({ version: data.version });
    }
    const result = await db.runTransaction(
      async (transaction) => {
        const [room, previous] = await transaction.getAll(
          roomRef,
          roomRef.collection('commands').doc(commandId),
        );
        const data = requireRoom(room);
        if (!data.memberUids.includes(actor.uid)) throw new SessionError('請先加入這座島嶼。', 403);
        if (previous.exists) {
          const receipt = record(previous.data());
          if (typeof receipt.version !== 'number') throw new SessionError('操作紀錄不完整。', 409);
          if (receipt.uid !== actor.uid) throw new SessionError('操作識別碼已被使用。', 409);
          return { version: receipt.version };
        }
        const patch = applyCommand(data, command, actor);
        const version = patch.version ?? data.version;
        if (Object.keys(patch).length) transaction.update(roomRef, patch);
        transaction.create(roomRef.collection('commands').doc(commandId), {
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
