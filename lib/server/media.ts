import { SessionError } from '../session';
import { record } from '../validation';
import { rateLimit } from './http';

export function parseDurationMs(value: unknown): number {
  if (typeof value !== 'string') throw new SessionError('影片長度資料不完整。', 502);
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value);
  if (!match) throw new SessionError('影片長度資料不正確。', 502);
  const duration = Math.round((Number(match[1] || 0) * 86400 + Number(match[2] || 0) * 3600 + Number(match[3] || 0) * 60 + Number(match[4] || 0)) * 1000);
  if (!Number.isSafeInteger(duration) || duration <= 0 || duration > 7 * 86400000)
    throw new SessionError('目前無法為這部影片建立有限播放時間線，請選擇其他影片。', 422);
  return duration;
}
const cache = new Map<string, { expires: number; promise: Promise<number> }>();
export function contentDuration(videoId: string): Promise<number> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return Promise.reject(new SessionError('影片識別碼不正確。', 422));
  // An explicit test-only fixture, never inferred from App Check or user identity.
  if (process.env.MELODY_TEST_MEDIA_DURATION_MS) {
    if (process.env.FIREBASE_PROJECT_ID !== 'demo-melody-island' ||
        process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' ||
        process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
        process.env.NEXT_PUBLIC_TEST_PLAYER !== 'true')
      throw new SessionError('Unsafe synthetic media configuration', 503);
    const duration = Number(process.env.MELODY_TEST_MEDIA_DURATION_MS);
    if (!Number.isSafeInteger(duration) || duration <= 0) throw new SessionError('Invalid synthetic duration', 503);
    return Promise.resolve(duration);
  }
  if (process.env.MELODY_REAL_MEDIA_FIXTURES) {
    if (process.env.FIREBASE_PROJECT_ID !== 'demo-melody-island' ||
      process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
      process.env.NEXT_PUBLIC_TEST_PLAYER !== 'false')
      throw new SessionError('Unsafe real-media fixture configuration', 503);
    const fixtures = record(JSON.parse(process.env.MELODY_REAL_MEDIA_FIXTURES));
    const duration = fixtures[videoId];
    if (typeof duration !== 'number' || !Number.isSafeInteger(duration) || duration <= 0)
      throw new SessionError('Missing independently measured media fixture', 503);
    return Promise.resolve(duration);
  }
  const existing = cache.get(videoId);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const promise = (async () => {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) throw new SessionError('影片長度驗證尚未設定，請聯絡島主。', 503);
    await rateLimit('service', 'youtube-metadata', 1000, 86400000);
    const params = new URLSearchParams({ key, id: videoId, part: 'contentDetails,status' });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!response.ok) throw new SessionError('無法確認影片長度，請稍後再試。', 502);
    const body = record(await response.json());
    if (!Array.isArray(body.items) || body.items.length !== 1) throw new SessionError('影片不存在或無法播放。', 422);
    const item = record(body.items[0]);
    if (item.id !== videoId || record(item.status).embeddable !== true) throw new SessionError('影片不允許嵌入播放。', 422);
    return parseDurationMs(record(item.contentDetails).duration);
  })();
  if (cache.size >= 256) cache.delete(cache.keys().next().value ?? '');
  cache.set(videoId, { promise, expires: Date.now() + 3600000 });
  void promise.catch(() => { if (cache.get(videoId)?.promise === promise) cache.delete(videoId); });
  return promise;
}
