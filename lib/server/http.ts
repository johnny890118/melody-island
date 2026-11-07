import { errorCode } from '../errors';
import { record } from '../validation';
import { adminServices } from './firebase';
import { SessionError } from '../session';
export async function authenticate(request: Request) {
  const origin = request.headers.get('origin');
  const expectedOrigin =
    process.env.APP_ORIGIN ||
    `${new URL(request.url).protocol}//${request.headers.get('host') || new URL(request.url).host}`;
  if (origin && origin !== expectedOrigin) throw new SessionError('不允許跨站請求。', 403);
  if (process.env.ENFORCE_APP_CHECK === 'true') {
    const attestation = request.headers.get('x-firebase-appcheck');
    if (!attestation) throw new SessionError('無法驗證此裝置，請重新整理後再試。', 403);
    try {
      await adminServices().appCheck.verifyToken(attestation);
    } catch {
      throw new SessionError('裝置驗證已失效，請重新整理後再試。', 403);
    }
  }
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new SessionError('請先登入或重新加入島嶼。', 401);
  try {
    return await adminServices().auth.verifyIdToken(token, true);
  } catch {
    throw new SessionError('登入已失效，請重新登入。', 401);
  }
}
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.body) throw new SessionError('請求內容不能為空。');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 12000) {
        await reader.cancel();
        throw new SessionError('請求內容過大。', 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    return record(JSON.parse(text) as unknown);
  } catch {
    throw new SessionError('請求格式不正確。');
  }
}
export function failure(error: unknown) {
  if (!(error instanceof SessionError))
    console.error('Session service error', {
      name: error instanceof Error ? error.name : 'unknown',
      code: errorCode(error) || 'unknown',
    });
  return Response.json(
    { error: error instanceof SessionError ? error.message : '服務暫時無法使用，請稍後再試。' },
    {
      status: error instanceof SessionError ? error.status : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
export async function rateLimit(uid: string, bucket: string, max: number, windowMs = 60000) {
  const { db } = adminServices();
  const ref = db.doc(`rateLimits/${uid}_${bucket}`);
  // Optimistic compare-and-set avoids a read-lock upgrade during overlapping
  // heartbeats and interactive commands. The precondition still makes the count atomic.
  for (let attempt = 0; attempt < 32; attempt++) {
    const snap = await ref.get();
    const data = snap.data();
    const now = Date.now();
    const count = data && data.until > now ? data.count : 0;
    if (count >= max) throw new SessionError('操作太頻繁，請稍後再試。', 429);
    const next = {
      count: count + 1,
      until: data && data.until > now ? data.until : now + windowMs,
    };
    try {
      if (snap.exists) await ref.update(next, { lastUpdateTime: snap.updateTime });
      else await ref.create(next);
      return;
    } catch (error) {
      if (![6, 9, 10].some((code) => code === errorCode(error))) throw error;
      // Spread a legitimate 20-member join burst instead of exhausting a small
      // synchronized retry budget on slower CI/deployment networks.
      const jitter = 15 + Math.random() * Math.min(250, 20 * 2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }
  throw new SessionError('操作正在排隊，請稍後再試。', 429);
}
