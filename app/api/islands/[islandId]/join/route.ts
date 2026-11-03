import type { RouteContext } from '@/lib/types';
import { requireRoom } from '@/lib/server/room';
import { adminServices } from '@/lib/server/firebase';
import { authenticate, failure, rateLimit, readBody } from '@/lib/server/http';
import { verifyPassword } from '@/lib/server/password';
import { assertRoomId, SessionError } from '@/lib/session';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const actor = await authenticate(request);
    const { islandId } = await params;
    assertRoomId(islandId);
    await rateLimit(actor.uid, 'join', 10);
    await rateLimit('room', `join_${islandId}`, 60);
    const { islandPassword } = await readBody(request);
    if (typeof islandPassword !== 'string' || islandPassword.length > 128)
      throw new SessionError('請輸入島嶼密碼。');
    const { db } = adminServices();
    const roomRef = db.doc(`islands/${islandId}`);
    const secretRef = db.doc(`islandSecrets/${islandId}`);
    const secret = await secretRef.get();
    if (!(await verifyPassword(islandPassword, secret.data()?.passwordHash)))
      throw new SessionError('島嶼 ID 或密碼不正確。', 403);
    await db.runTransaction(
      async (transaction) => {
        const room = await transaction.get(roomRef);
        const data = requireRoom(room);
        if (data.memberUids.includes(actor.uid)) return;
        if (data.memberCount >= 20) throw new SessionError('這座島嶼已達 20 位成員上限。', 409);
        transaction.update(roomRef, {
          memberCount: data.memberCount + 1,
          memberUids: [...data.memberUids, actor.uid],
          members: {
            ...data.members,
            [actor.uid]: {
              uid: actor.uid,
              role: 'guest',
              displayName: (actor.name || '聽友').slice(0, 60),
              joinedAt: Date.now(),
            },
          },
        });
      },
      { maxAttempts: 10 },
    );
    return Response.json({ id: islandId });
  } catch (error) {
    return failure(error);
  }
}
