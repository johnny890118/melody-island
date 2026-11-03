import { randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
const scrypt = (password: string, salt: string, length: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    derive(password, salt, length, (error, key) => (error ? reject(error) : resolve(key)));
  });
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string | undefined): Promise<boolean> {
  const [salt, encoded] = (hash || '').split(':');
  if (!salt || !encoded || encoded.length !== 128) return false;
  const result = await scrypt(password, salt, 64);
  return timingSafeEqual(result, Buffer.from(encoded, 'hex'));
}
