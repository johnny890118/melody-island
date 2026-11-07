import type { RouteContext } from '@/lib/types';
import { adminServices } from '@/lib/server/firebase';
import { authenticate, failure, rateLimit, readBody } from '@/lib/server/http';
import { hashPassword } from '@/lib/server/password';
import { requireRoom } from '@/lib/server/room';
import { assertRoomId, SessionError } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const actor = await authenticate(request);
    const { islandId } = await params;
    assertRoomId(islandId);
    await rateLimit(actor.uid, 'room-password', 5);
    const { islandPassword } = await readBody(request);
    if (typeof islandPassword !== 'string' || islandPassword.length < 8 || islandPassword.length > 128)
      throw new SessionError('密碼需為 8–128 字。');

    const { db } = adminServices();
    const roomRef = db.doc(`islands/${islandId}`);
    const secretRef = db.doc(`islandSecrets/${islandId}`);
    const assertOwner = (room: ReturnType<typeof requireRoom>) => {
      if (room.ownerUid !== actor.uid) throw new SessionError('只有島主可以重設密碼。', 403);
    };
    assertOwner(requireRoom(await roomRef.get()));
    const passwordHash = await hashPassword(islandPassword);
    await db.runTransaction(async transaction => {
      assertOwner(requireRoom(await transaction.get(roomRef)));
      transaction.set(secretRef, { passwordHash }, { merge: true });
    });
    return Response.json({ id: islandId });
  } catch (error) {
    return failure(error);
  }
}
