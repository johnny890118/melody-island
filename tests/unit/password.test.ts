import { it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../lib/server/password';
it('salts each hash and verifies only the correct password', async () => {
  const first = await hashPassword('my private island');
  const second = await hashPassword('my private island');
  expect(first).not.toBe(second);
  expect(first).not.toContain('my private island');
  expect(await verifyPassword('my private island', first)).toBe(true);
  expect(await verifyPassword('wrong password', first)).toBe(false);
});
it('rejects absent or malformed hashes', async () => {
  expect(await verifyPassword('anything', undefined)).toBe(false);
});
