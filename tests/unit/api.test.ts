// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ getToken: vi.fn(async () => ({ token: 'attestation' })) }));
vi.mock('firebase/app-check', () => ({ getToken: state.getToken }));
vi.mock('../../app/config/firebase', () => ({
  appCheck: { app: { name: 'test' } },
  auth: { authStateReady: async () => {}, currentUser: { getIdToken: async () => 'identity' } },
}));
import { api } from '../../lib/api';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ ok: true })),
  );
});
afterEach(() => vi.unstubAllGlobals());
it('sends separate identity and app-attestation headers to the backend', async () => {
  await expect(api('/api/islands', { name: 'test' })).resolves.toEqual({ ok: true });
  expect(fetch).toHaveBeenCalledWith(
    '/api/islands',
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer identity',
        'X-Firebase-AppCheck': 'attestation',
      }),
    }),
  );
});
it('does not send an unattested request when the configured provider fails', async () => {
  state.getToken.mockRejectedValueOnce(new Error('Provider unavailable'));
  await expect(api('/api/time')).rejects.toMatchObject({
    status: 403,
    message: '裝置驗證失敗，請重新整理後再試。',
  });
  expect(fetch).not.toHaveBeenCalled();
});
