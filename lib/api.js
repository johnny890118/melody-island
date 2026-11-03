import { auth } from '@/app/config/firebase';
import { signInAnonymously } from 'firebase/auth';
let guestLogin;
export async function ensureUser() {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  guestLogin ||= signInAnonymously(auth).finally(() => {
    guestLogin = null;
  });
  return (await guestLogin).user;
}
export async function api(path, body, options = {}) {
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
  const result = await response.json().catch(() => ({ error: '服務回應不完整，請稍後再試。' }));
  if (!response.ok) {
    const error = new Error(result.error || '服務暫時無法使用。');
    error.status = response.status;
    throw error;
  }
  return result;
}
