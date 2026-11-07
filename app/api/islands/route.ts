import type { Room } from '@/lib/types';
import { randomBytes } from 'node:crypto';
import { adminServices } from '@/lib/server/firebase';
import { authenticate, failure, rateLimit, readBody } from '@/lib/server/http';
import { hashPassword } from '@/lib/server/password';
import { DEFAULT_PERMISSIONS, SessionError } from '@/lib/session';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const actor = await authenticate(request);
    if (actor.firebase?.sign_in_provider === 'anonymous')
      throw new SessionError('請使用 Google 登入後建立島嶼。', 403);
    await rateLimit(actor.uid, 'create', 5, 3600000);
    const { islandName, islandPassword } = await readBody(request);
    if (
      typeof islandName !== 'string' ||
      !islandName.trim() ||
      islandName.trim().length > 40 ||
      typeof islandPassword !== 'string' ||
      islandPassword.length < 8 ||
      islandPassword.length > 128
    )
      throw new SessionError('名稱需為 1–40 字，密碼需為 8–128 字。');
    const id = randomBytes(8).toString('base64url').slice(0, 10);
    const { db } = adminServices();
    const now = Date.now();
    const batch = db.batch();
    batch.create(db.doc(`islands/${id}`), {
      id,
      name: islandName.trim(),
      ownerUid: actor.uid,
      schemaVersion: 2,
      memberCount: 1,
      memberUids: [actor.uid],
      members: {
        [actor.uid]: {
          uid: actor.uid,
          role: 'owner',
          displayName: (actor.name || '島主').slice(0, 60),
          joinedAt: now,
        },
      },
      playlist: [],
      currentVideo: '',
      positionMs: 0,
      isPlaying: false,
      shuffle: false,
      version: 0,
      playbackRevision: 0,
      trackEpoch: 0,
      leaseTerm: 0,
      playbackUpdatedAt: now,
      updatedAt: now,
      permissions: DEFAULT_PERMISSIONS,
    } satisfies Room);
    batch.create(db.doc(`islandSecrets/${id}`), {
      passwordHash: await hashPassword(islandPassword),
    });
    await batch.commit();
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
