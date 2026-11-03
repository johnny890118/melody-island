import { auth } from '@/app/config/firebase';
import { signInAnonymously, type User, type UserCredential } from 'firebase/auth';
import { ApiError } from './errors';
let guestLogin: Promise<UserCredential> | undefined;
export async function ensureUser(): Promise<User> {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  guestLogin ||= signInAnonymously(auth).finally(() => {
    guestLogin = undefined;
  });
  return (await guestLogin).user;
}
export async function api<T>(path: string, body?: unknown, options: RequestInit = {}): Promise<T> {
  const user = await ensureUser();
  const token = await user.getIdToken();
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...options,
    signal: options.signal || AbortSignal.timeout(15000),
  });
  const result: unknown = await response
    .json()
    .catch(() => ({ error: '服務回應不完整，請稍後再試。' }));
  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
        ? result.error
        : '服務暫時無法使用。';
    throw new ApiError(message, response.status);
  }
  // Same-origin DTOs are constructed by our validated route handlers; Firestore
  // snapshots and external YouTube payloads use explicit runtime parsers instead.
  return result as T;
}
