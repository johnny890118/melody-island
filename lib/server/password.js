import { randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(derive);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}
export async function verifyPassword(password, hash) {
  const [salt, encoded] = (hash || '').split(':');
  if (!salt || !encoded || encoded.length !== 128) return false;
  const result = await scrypt(password, salt, 64);
  return timingSafeEqual(result, Buffer.from(encoded, 'hex'));
}
