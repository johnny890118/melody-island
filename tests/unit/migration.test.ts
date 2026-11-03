import { expect, it } from 'vitest';
import { prepareLegacyRoom } from '../../lib/server/migration';
import { verifyPassword } from '../../lib/server/password';
const owner = { uid: 'owner', email: 'owner@example.test', emailVerified: true };
const legacy = {
  name: 'Old room',
  password: 'legacy-test-123',
  createdBy: owner.email,
  playlist: [{ videoId: 'abcdefghijk', title: 'Song', thumbnail: 'https://untrusted.test' }],
  currentVideo: 'abcdefghijk',
  positionMs: 12000,
  isPlaying: true,
};
it('converts with a private hash and pauses playback without carrying legacy fields', async () => {
  const result = await prepareLegacyRoom('abcdefghij', legacy, owner, 1000);
  expect(result.room).toMatchObject({
    ownerUid: 'owner',
    isPlaying: false,
    positionMs: 12000,
    memberUids: ['owner'],
    version: 0,
  });
  expect(result.room).not.toHaveProperty('password');
  expect(result.room).not.toHaveProperty('createdBy');
  expect(result.room.playlist[0].thumbnail).toBe(
    'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
  );
  expect(await verifyPassword(legacy.password, result.secret.passwordHash)).toBe(true);
});
it('refuses an unverified/mismatched owner or an already migrated room', async () => {
  await expect(
    prepareLegacyRoom('abcdefghij', legacy, { ...owner, emailVerified: false }, 1000),
  ).rejects.toHaveProperty('status', 403);
  await expect(
    prepareLegacyRoom('abcdefghij', legacy, { ...owner, email: 'other@example.test' }, 1000),
  ).rejects.toHaveProperty('status', 403);
  await expect(
    prepareLegacyRoom('abcdefghij', { ...legacy, schemaVersion: 2 }, owner, 1000),
  ).rejects.toThrow('legacy');
});
it('requires manual resolution rather than dropping duplicates or malformed playback', async () => {
  await expect(
    prepareLegacyRoom(
      'abcdefghij',
      { ...legacy, playlist: [legacy.playlist[0], legacy.playlist[0]] },
      owner,
      1000,
    ),
  ).rejects.toThrow('duplicate');
  await expect(
    prepareLegacyRoom('abcdefghij', { ...legacy, currentVideo: 'missing' }, owner, 1000),
  ).rejects.toThrow('playback');
  await expect(
    prepareLegacyRoom('abcdefghij', { ...legacy, password: '' }, owner, 1000),
  ).rejects.toThrow('password');
});
