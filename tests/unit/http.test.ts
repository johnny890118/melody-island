import { afterEach, it, expect, vi } from 'vitest';
const checks = vi.hoisted(() => ({ verifyToken: vi.fn(async (_token: string) => ({})) }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
vi.mock('../../lib/server/firebase', () => ({
  adminServices: () => ({
    auth: { verifyIdToken: async () => ({ uid: 'verified' }) },
    appCheck: { verifyToken: checks.verifyToken },
  }),
}));
import { authenticate, readBody } from '../../lib/server/http';
it('accepts the browser host even when Next internal URL uses localhost', async () => {
  const request = new Request('http://localhost:3100/api/islands', {
    headers: {
      host: '127.0.0.1:3100',
      origin: 'http://127.0.0.1:3100',
      authorization: 'Bearer token',
    },
  });
  expect((await authenticate(request)).uid).toBe('verified');
});
it('rejects cross-site callers before token verification', async () => {
  await expect(
    authenticate(
      new Request('https://island.test/api', {
        headers: {
          host: 'island.test',
          origin: 'https://foreign.test',
          authorization: 'Bearer token',
        },
      }),
    ),
  ).rejects.toHaveProperty('status', 403);
});
it('bounds streamed body size', async () => {
  const request = new Request('http://localhost/api', {
    method: 'POST',
    body: JSON.stringify({ title: 'a'.repeat(12000) }),
  });
  await expect(readBody(request)).rejects.toHaveProperty('status', 413);
});
it('rejects invalid JSON', async () => {
  await expect(
    readBody(new Request('http://localhost/api', { method: 'POST', body: '{bad' })),
  ).rejects.toHaveProperty('status', 400);
});

it('requires attestation when enforcement is enabled, without an emulator bypass', async () => {
  vi.stubEnv('ENFORCE_APP_CHECK', 'true');
  vi.stubEnv('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8080');
  const request = new Request('https://island.test/api', {
    headers: { authorization: 'Bearer token' },
  });
  await expect(authenticate(request)).rejects.toHaveProperty('status', 403);
  expect(checks.verifyToken).not.toHaveBeenCalled();
});
it('checks attestation before accepting the authenticated actor', async () => {
  vi.stubEnv('ENFORCE_APP_CHECK', 'true');
  const request = new Request('https://island.test/api', {
    headers: {
      authorization: 'Bearer token',
      'X-Firebase-AppCheck': 'attested-token',
    },
  });
  expect((await authenticate(request)).uid).toBe('verified');
  expect(checks.verifyToken).toHaveBeenCalledWith('attested-token');
  checks.verifyToken.mockRejectedValueOnce(new Error('Expired signature'));
  await expect(authenticate(request)).rejects.toHaveProperty('status', 403);
});
