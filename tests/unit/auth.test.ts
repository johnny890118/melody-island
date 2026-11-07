import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { makeStore } from '../../store/store';
import { startGoogleLogin, fetchUser } from '../../store/authSlice';

const { popup, redirect, redirectResult } = vi.hoisted(() => ({ popup: vi.fn(), redirect: vi.fn(), redirectResult: vi.fn() }));
vi.mock('../../app/config/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  signInWithPopup: popup,
  signInWithRedirect: redirect,
  getRedirectResult: redirectResult,
  signOut: vi.fn(),
}));

beforeEach(() => {
  popup.mockReset();
  redirect.mockReset();
  redirectResult.mockReset();
});

it('shares a single popup across login entry points and adopts the returned identity', async () => {
  const store = makeStore();
  let complete: (result: unknown) => void = () => {};
  popup.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const first = store.dispatch(startGoogleLogin());
  const duplicate = await store.dispatch(startGoogleLogin());
  expect(startGoogleLogin.rejected.match(duplicate) && duplicate.meta.condition).toBe(true);
  expect(popup).toHaveBeenCalledOnce();
  complete({
    user: { uid: 'demo-user', email: null, displayName: null, photoURL: null, isAnonymous: false },
  });
  await first;
  expect(store.getState().auth).toMatchObject({
    status: 'idle',
    ready: true,
    user: { uid: 'demo-user' },
  });
});

it('lets the user retry after cancelling the popup', async () => {
  const store = makeStore();
  popup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
  const first = await store.dispatch(startGoogleLogin());
  expect(first.payload).toBe('已取消登入，可以再試一次。');
  expect(store.getState().auth.status).toBe('idle');
  await store.dispatch(startGoogleLogin());
  expect(popup).toHaveBeenCalledTimes(2);
});


afterEach(() => vi.unstubAllEnvs());

it('uses same-tab Google sign-in when enabled and shows redirect failures', async () => {
  vi.stubEnv('NEXT_PUBLIC_AUTH_REDIRECT', 'true');
  redirect.mockRejectedValue({ code: 'auth/unauthorized-domain' });
  const store = makeStore();
  const result = await store.dispatch(startGoogleLogin());
  expect(redirect).toHaveBeenCalledOnce();
  expect(popup).not.toHaveBeenCalled();
  expect(result.payload).toBe('此網址尚未獲得登入授權，請使用官方島嶼網址。');
  expect(store.getState().auth.status).toBe('idle');
});

it('surfaces a failed Google callback and releases the loading state', async () => {
  vi.stubEnv('NEXT_PUBLIC_AUTH_REDIRECT', 'true');
  redirectResult.mockRejectedValue({ code: 'auth/network-request-failed' });
  const store = makeStore();
  await store.dispatch(fetchUser());
  expect(store.getState().auth).toMatchObject({
    ready: true,
    status: 'idle',
    error: { message: 'Google 登入未完成，請重新按「登入」再試。' },
  });
});
