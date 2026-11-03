import { SessionError, DEFAULT_PERMISSIONS } from './session';
import type { Member, Permissions, Room, RoomCommand, Song } from './types';
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new SessionError('資料格式不正確。');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new SessionError('資料格式不正確。');
  return value;
}
function numeric(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new SessionError('資料數值不正確。');
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new SessionError('資料狀態不正確。');
  return value;
}
export function parsePermissions(value: unknown): Permissions {
  const data = record(value);
  if (
    Object.keys(data).length !== 3 ||
    Object.keys(DEFAULT_PERMISSIONS).some((key) => typeof data[key] !== 'boolean')
  )
    throw new SessionError('權限設定不完整。');
  return {
    guestsCanControlPlayback: boolean(data.guestsCanControlPlayback),
    guestsCanEditQueue: boolean(data.guestsCanEditQueue),
    guestsCanSkip: boolean(data.guestsCanSkip),
  };
}
export function parseCommand(value: unknown): RoomCommand {
  const data = record(value);
  const meta = {
    ...(typeof data.commandId === 'string' ? { commandId: data.commandId } : {}),
    ...(typeof data.expectedVersion === 'number' ? { expectedVersion: data.expectedVersion } : {}),
  };
  switch (data.type) {
    case 'add': {
      const song = record(data.song);
      return {
        ...meta,
        type: 'add',
        song: { videoId: text(song.videoId), title: text(song.title) },
      };
    }
    case 'remove':
    case 'select':
      return { ...meta, type: data.type, videoId: text(data.videoId) };
    case 'play':
    case 'pause':
    case 'next':
    case 'prev':
      return { ...meta, type: data.type };
    case 'ended':
      return { ...meta, type: 'ended', videoId: text(data.videoId), clientId: text(data.clientId) };
    case 'lease':
      return { ...meta, type: 'lease', clientId: text(data.clientId) };
    case 'mode':
      if (typeof data.shuffle !== 'boolean') throw new SessionError('播放模式不正確。');
      return { ...meta, type: 'mode', shuffle: data.shuffle };
    case 'permissions':
      return { ...meta, type: 'permissions', permissions: parsePermissions(data.permissions) };
    default:
      throw new SessionError('不支援的操作。');
  }
}
export function parseRoom(value: unknown): Room {
  const data = record(value);
  if (data.schemaVersion !== 2) throw new SessionError('這座島嶼需要更新。', 409);
  if (
    !Array.isArray(data.memberUids) ||
    data.memberUids.length > 20 ||
    !Array.isArray(data.playlist) ||
    data.playlist.length > 100
  )
    throw new SessionError('島嶼資料不完整。');
  const members: Record<string, Member> = {};
  for (const [key, raw] of Object.entries(record(data.members))) {
    const member = record(raw);
    if (member.role !== 'owner' && member.role !== 'guest')
      throw new SessionError('成員資料不完整。');
    members[key] = {
      uid: text(member.uid),
      role: member.role,
      displayName: text(member.displayName),
      joinedAt: numeric(member.joinedAt),
    };
  }
  const playlist: Song[] = data.playlist.map((raw) => {
    const song = record(raw);
    return {
      videoId: text(song.videoId),
      title: text(song.title),
      thumbnail: text(song.thumbnail),
      ...(typeof song.addedByUid === 'string' ? { addedByUid: song.addedByUid } : {}),
    };
  });
  return {
    id: text(data.id),
    name: text(data.name),
    ownerUid: text(data.ownerUid),
    schemaVersion: 2,
    memberCount: numeric(data.memberCount),
    memberUids: data.memberUids.map(text),
    members,
    playlist,
    permissions: parsePermissions(data.permissions),
    shuffle: boolean(data.shuffle),
    version: numeric(data.version),
    updatedAt: numeric(data.updatedAt),
    currentVideo: text(data.currentVideo),
    positionMs: numeric(data.positionMs),
    isPlaying: boolean(data.isPlaying),
    playbackUpdatedAt: numeric(data.playbackUpdatedAt),
    ...(typeof data.lastChangedBy === 'string' ? { lastChangedBy: data.lastChangedBy } : {}),
    ...(typeof data.leaderUid === 'string' ? { leaderUid: data.leaderUid } : {}),
    ...(typeof data.leaderClientId === 'string' ? { leaderClientId: data.leaderClientId } : {}),
    ...(typeof data.leaseExpiresAt === 'number'
      ? { leaseExpiresAt: numeric(data.leaseExpiresAt) }
      : {}),
  };
}
export function parseYouTubeResults(value: unknown): Song[] {
  const body = record(value);
  if (!Array.isArray(body.items)) throw new SessionError('搜尋結果格式不正確。', 502);
  return body.items.map((raw) => {
    const item = record(raw);
    const id = text(record(item.id).videoId);
    const title = text(record(item.snippet).title);
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new SessionError('搜尋結果格式不正確。', 502);
    return { videoId: id, title, thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` };
  });
}
export function parseMemberCommand(value: unknown): import('./types').MemberCommand {
  const data = record(value);
  if (data.type === 'leave') return { type: 'leave' };
  if (
    (data.type === 'kick' || data.type === 'transfer') &&
    typeof data.targetUid === 'string' &&
    /^[a-zA-Z0-9_-]{1,128}$/.test(data.targetUid)
  )
    return { type: data.type, targetUid: data.targetUid };
  throw new SessionError('成員操作不正確。');
}
