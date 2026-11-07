import { parseMemberCommand } from '@/lib/validation';
import type { RouteContext } from '@/lib/types';
import { requireRoom } from '@/lib/server/room';
import { adminServices } from '@/lib/server/firebase';
import { authenticate, failure, rateLimit, readBody } from '@/lib/server/http';
import { assertRoomId, SessionError } from '@/lib/session';
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const actor = await authenticate(request);
    const { islandId } = await params;
    assertRoomId(islandId);
    await rateLimit(actor.uid, 'members', 20);
    const action = parseMemberCommand(await readBody(request));
    const { type } = action;
    const { db } = adminServices();
    const ref = db.doc(`islands/${islandId}`);
    await db.runTransaction(
      async (transaction) => {
        const target = action.type === 'leave' ? actor.uid : action.targetUid;
        const room = await transaction.get(ref);
        const data = requireRoom(room);
        if (!data.memberUids.includes(actor.uid))
          throw new SessionError('你尚未加入這座島嶼。', 403);
        if (type !== 'leave' && data.ownerUid !== actor.uid)
          throw new SessionError('只有島主可以管理島民。', 403);
        if (!data.memberUids.includes(target)) throw new SessionError('島民已離開島嶼。', 409);
        if (type === 'transfer') {
          if (target === actor.uid) throw new SessionError('請選擇其他島民。');
          transaction.update(ref, {
            ownerUid: target,
            members: {
              ...data.members,
              [actor.uid]: { ...data.members[actor.uid], role: 'guest' },
              [target]: { ...data.members[target], role: 'owner' },
            },
          });
        } else {
          if (data.ownerUid === target)
            throw new SessionError('離開前，請先把島主交給另一位島民。', 409);
          const members = { ...data.members };
          delete members[target];
          transaction.update(ref, {
            memberCount: data.memberCount - 1,
            memberUids: data.memberUids.filter((uid) => uid !== target),
            members,
            ...(data.leaderUid === target
              ? { leaderUid: '', leaderClientId: '', leaseExpiresAt: 0 }
              : {}),
          });
        }
      },
      { maxAttempts: 10 },
    );
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
