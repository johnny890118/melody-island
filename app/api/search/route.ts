import { parseYouTubeResults } from '@/lib/validation';
import { authenticate, failure, rateLimit } from '@/lib/server/http';
import { SessionError } from '@/lib/session';
export async function GET(request: Request) {
  try {
    const actor = await authenticate(request);
    await rateLimit(actor.uid, 'search', 10);
    const query = new URL(request.url).searchParams.get('q')?.trim();
    if (!query || query.length > 100) throw new SessionError('請輸入 1–100 字的搜尋內容。');
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) throw new SessionError('音樂搜尋尚未設定，請聯絡島主。', 503);
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q: query,
      key,
      maxResults: '8',
      videoEmbeddable: 'true',
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
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
