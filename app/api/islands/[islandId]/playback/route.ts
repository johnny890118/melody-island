import type { RouteContext } from '@/lib/types';
import { adminServices } from '@/lib/server/firebase';
import { authenticate, failure, rateLimit } from '@/lib/server/http';
import { requireRoom } from '@/lib/server/room';
import { contentDuration } from '@/lib/server/media';
import { assertRoomId, SessionError } from '@/lib/session';
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const actor = await authenticate(request);
    const { islandId } = await params;
    assertRoomId(islandId);
    const room = requireRoom(await adminServices().db.doc(`islands/${islandId}`).get());
    if (!room.memberUids.includes(actor.uid)) throw new SessionError('請先加入這座島嶼。', 403);
    await rateLimit(actor.uid, 'media-metadata', 30);
    const song = room.playlist.find(item => item.videoId === room.currentVideo);
    const durationMs = song ? song.durationMs ?? await contentDuration(song.videoId) : 0;
    return Response.json({ videoId: room.currentVideo, trackEpoch: room.trackEpoch ?? 0, durationMs }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
