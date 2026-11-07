// Offline conversion only. Never import this into a request handler.
import type { Room, Song } from '../types';
import { assertRoomId, DEFAULT_PERMISSIONS, SessionError } from '../session';
import { parsePermissions, record } from '../validation';
import { hashPassword } from './password';
interface VerifiedOwner {
  uid: string;
  email?: string;
  emailVerified: boolean;
  displayName?: string;
}
export async function prepareLegacyRoom(
  id: string,
  input: unknown,
  owner: VerifiedOwner,
  now: number,
) {
  assertRoomId(id);
  const data = record(input);
  if (data.schemaVersion !== undefined && data.schemaVersion !== 1)
    throw new SessionError('Only legacy rooms may be converted.');
  if (!owner.emailVerified || !owner.uid || !owner.email || data.createdBy !== owner.email)
    throw new SessionError('Resolve the owner using a verified Admin Auth record.', 403);
  if (
    typeof data.name !== 'string' ||
    !data.name.trim() ||
    data.name.trim().length > 40 ||
    typeof data.password !== 'string' ||
    data.password.length < 8 ||
    data.password.length > 128
  )
    throw new SessionError('Resolve invalid legacy name/password before migration.');
  if (!Array.isArray(data.playlist) || data.playlist.length > 100)
    throw new SessionError('Resolve invalid or oversized legacy queues before migration.');
  const ids = new Set<string>();
  const playlist: Song[] = data.playlist.map((raw) => {
    const song = record(raw);
    if (
      typeof song.videoId !== 'string' ||
      !/^[A-Za-z0-9_-]{11}$/.test(song.videoId) ||
      typeof song.title !== 'string' ||
      !song.title.trim() ||
      song.title.length > 200 ||
      ids.has(song.videoId)
    )
      throw new SessionError('Resolve invalid or duplicate legacy songs before migration.');
    ids.add(song.videoId);
    return {
      videoId: song.videoId,
      title: song.title.trim(),
      thumbnail: `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`,
    };
  });
  if (
    typeof data.currentVideo !== 'string' ||
    (data.currentVideo && !ids.has(data.currentVideo)) ||
    typeof data.positionMs !== 'number' ||
    !Number.isFinite(data.positionMs) ||
    data.positionMs < 0 ||
    !Number.isFinite(now) ||
    now < 0
  )
    throw new SessionError('Resolve invalid legacy playback before migration.');
  const room: Room = {
    id,
    name: data.name.trim(),
    ownerUid: owner.uid,
    schemaVersion: 2,
    memberCount: 1,
    memberUids: [owner.uid],
    members: {
      [owner.uid]: {
        uid: owner.uid,
        role: 'owner',
        displayName: (owner.displayName || '島主').slice(0, 60),
        joinedAt: now,
      },
    },
    playlist,
    currentVideo: data.currentVideo,
    positionMs: data.currentVideo ? data.positionMs : 0,
    isPlaying: false,
    playbackUpdatedAt: now,
    updatedAt: now,
    version: 0,
    shuffle: data.shuffle === true,
    permissions:
      data.permissions === undefined
        ? { ...DEFAULT_PERMISSIONS }
        : parsePermissions(data.permissions),
  };
  return { room, secret: { passwordHash: await hashPassword(data.password) } };
}
