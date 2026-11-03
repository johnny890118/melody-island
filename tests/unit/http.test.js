import { it, expect, vi } from 'vitest';
vi.mock('../../lib/server/firebase', () => ({
  adminServices: () => ({ auth: { verifyIdToken: async () => ({ uid: 'verified' }) } }),
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
