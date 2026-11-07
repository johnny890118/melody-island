import { parseYouTubeResults } from '@/lib/validation';
import { authenticate, failure, rateLimit } from '@/lib/server/http';
import { adminServices } from '@/lib/server/firebase';
import { requireRoom } from '@/lib/server/room';
import { assertRoomId, SessionError } from '@/lib/session';
export async function GET(request: Request) {
  try {
    const actor = await authenticate(request);
    const params = new URL(request.url).searchParams;
    const islandId = params.get('islandId') || '';
    assertRoomId(islandId);
    const query = params.get('q')?.trim();
    if (!query || query.length > 100) throw new SessionError('請輸入 1–100 字的搜尋內容。');
    const room = requireRoom(await adminServices().db.doc(`islands/${islandId}`).get());
    if (!room.memberUids.includes(actor.uid)) throw new SessionError('請先加入這座島嶼。', 403);
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) throw new SessionError('音樂搜尋尚未設定，請聯絡島主。', 503);
    await rateLimit(actor.uid, 'search', 10);
    const budget = Number(process.env.YOUTUBE_SEARCH_DAILY_LIMIT || '80');
    if (!Number.isSafeInteger(budget) || budget < 1 || budget > 10000)
      throw new SessionError('搜尋配額設定不正確，請聯絡島主。', 503);
    await rateLimit('service', 'youtube-search', budget, 86400000);
    const upstreamParams = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q: query,
      key,
      maxResults: '8',
      videoEmbeddable: 'true',
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${upstreamParams}`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!response.ok) throw new SessionError('搜尋服務暫時忙碌，請稍後再試。', 502);
    const data = await response.json();
    return Response.json({
      items: parseYouTubeResults(data),
    });
  } catch (error) {
    return failure(error);
  }
}
