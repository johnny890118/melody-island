import { beforeEach, expect, it, vi } from 'vitest';
import { makeStore } from '../../store/store';
import { startGoogleLogin } from '../../store/authSlice';

const { popup } = vi.hoisted(() => ({ popup: vi.fn() }));
vi.mock('../../app/config/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  signInWithPopup: popup,
  signOut: vi.fn(),
}));

beforeEach(() => {
  popup.mockReset();
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
