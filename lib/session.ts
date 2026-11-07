import type { Identity, Permissions, Playback, Room, RoomCommand } from './types';
export const DEFAULT_PERMISSIONS: Permissions = {
  guestsCanControlPlayback: true,
  guestsCanEditQueue: true,
  guestsCanSkip: true,
};
export class SessionError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}
export function timestampToMillis(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value || typeof value !== 'object') return 0;
  if ('toMillis' in value && typeof value.toMillis === 'function') {
    const result: unknown = value.toMillis();
    return typeof result === 'number' && Number.isFinite(result) ? result : 0;
  }
  if ('seconds' in value && typeof value.seconds === 'number')
    return (
      value.seconds * 1000 +
      ('nanoseconds' in value && typeof value.nanoseconds === 'number' ? value.nanoseconds : 0) /
        1e6
    );
  return 0;
}
export function expectedSeconds(
  data: Partial<Playback> | undefined | null,
  now = Date.now(),
): number {
  const position = Math.max(
    0,
    typeof data?.positionMs === 'number' && Number.isFinite(data.positionMs) ? data.positionMs : 0,
  );
  const at = timestampToMillis(data?.playbackUpdatedAt);
  return (position + (data?.isPlaying && at ? Math.max(0, now - at) : 0)) / 1000;
}
export function assertRoomId(id: unknown): string {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{10}$/.test(id))
    throw new SessionError('島嶼 ID 格式不正確。');
  return id;
}
// Give each track a fixed rank for this shuffle session. Adding a track
// does not reorder the existing tracks, and stepping backward reverses a skip.
function shuffleRank(videoId: string, seed: number): number {
  let hash = 2166136261;
  for (const character of `${seed}:${videoId}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  return (hash ^ (hash >>> 13)) >>> 0;
}

export function playbackOrder(data: Room) {
  if (!data.shuffle) return data.playlist;
  const seed = data.shuffleSeed ?? 0;
  return data.playlist
    .map(song => ({ song, rank: shuffleRank(song.videoId, seed) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ song }) => song);
}

export function applyCommand(
  data: Room,
  command: RoomCommand,
  actor: Identity,
  now = Date.now(),
): Partial<Room> {
  const owner = Boolean(actor.uid) && actor.uid === data.ownerUid;
  const permissions = { ...DEFAULT_PERMISSIONS, ...data.permissions };
  const kind = command.type;
  const capabilities: Partial<Record<RoomCommand['type'], keyof Permissions>> = {
    add: 'guestsCanEditQueue',
    remove: 'guestsCanEditQueue',
    play: 'guestsCanControlPlayback',
    pause: 'guestsCanControlPlayback',
    select: 'guestsCanControlPlayback',
    next: 'guestsCanSkip',
    prev: 'guestsCanSkip',
    mode: 'guestsCanControlPlayback',
  };
  const capability = capabilities[kind];
  if (!['lease', 'ended', 'advance', 'permissions'].includes(kind) && !capability)
    throw new SessionError('不支援的操作。');
  if (capability && !owner && !permissions[capability])
    throw new SessionError('你目前沒有這項操作權限。', 403);
  if ((kind === 'lease' || kind === 'ended') && !owner && !permissions.guestsCanSkip)
    throw new SessionError('目前由島主管理自動切歌。', 403);
  const playlist = [...(data.playlist || [])];
  const version = data.version || 0;
  const revision = data.playbackRevision ?? 0;
  const playbackIntent = ['play', 'pause', 'select', 'next', 'prev', 'ended', 'advance'].includes(kind);
  // Playback conflicts use only the timeline revision, not queue/roster/permission chatter.
  if (playbackIntent && command.expectedPlaybackRevision !== undefined
    ? command.expectedPlaybackRevision !== revision
    : !['add', 'remove', 'lease', 'permissions'].includes(kind) && command.expectedVersion !== version)
    throw new SessionError('播放狀態已更新，請再試一次。', 409);
  const patch: Partial<Room> = {};
  const changeTrack = (videoId: string, startAt = now, epochDelta = 1) =>
    Object.assign(patch, {
      currentVideo: videoId,
      positionMs: 0,
      isPlaying: Boolean(videoId),
      playbackUpdatedAt: startAt,
      trackEpoch: (data.trackEpoch ?? 0) + epochDelta,
    });
  if (kind === 'add') {
    const song = command.song;
    if (
      !song ||
      !/^[A-Za-z0-9_-]{11}$/.test(song.videoId) ||
      typeof song.title !== 'string' ||
      !song.title.trim() ||
      song.title.length > 300
    )
      throw new SessionError('歌曲資料不完整。');
    if (playlist.some((item) => item.videoId === song.videoId))
      throw new SessionError('歌曲已在佇列中。', 409);
    if (playlist.length >= 100) throw new SessionError('每座島嶼最多保留 100 首歌曲。');
    playlist.push({
      videoId: song.videoId,
      title: song.title.trim(),
      thumbnail: `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`,
      addedByUid: actor.uid,
      ...(song.durationMs !== undefined ? { durationMs: song.durationMs } : {}),
    });
    patch.playlist = playlist;
  }
  if (kind === 'remove') {
    const index = playlist.findIndex((item) => item.videoId === command.videoId);
    if (index < 0) return {};
    playlist.splice(index, 1);
    patch.playlist = playlist;
    if (data.currentVideo === command.videoId) {
      changeTrack(playlist[index]?.videoId || playlist[0]?.videoId || '');
      patch.isPlaying = Boolean(patch.currentVideo) && data.isPlaying;
    }
  }
  if (kind === 'play' || kind === 'pause') {
    if ((kind === 'play') === data.isPlaying) return {};
    const current = data.currentVideo || playbackOrder(data)[0]?.videoId || '';
    if (!current) throw new SessionError('先加入一首歌曲吧。');
    const durationMs = playlist.find(song => song.videoId === current)?.durationMs;
    if (kind === 'play' && (!data.currentVideo || (durationMs && data.positionMs >= durationMs))) {
      changeTrack(current);
    } else {
    Object.assign(patch, {
      currentVideo: current,
      positionMs: Math.round(expectedSeconds(data, now) * 1000),
      isPlaying: kind === 'play',
      playbackUpdatedAt: now,
    });
    }
  }
  if (kind === 'select') {
    if (!playlist.some((item) => item.videoId === command.videoId))
      throw new SessionError('歌曲已不在佇列中。', 409);
    changeTrack(command.videoId);
  }
  if (kind === 'next' || kind === 'prev' || kind === 'ended' || kind === 'advance') {
    if (
      kind === 'ended' &&
      (!data.isPlaying ||
        data.leaderUid !== actor.uid ||
        data.leaderClientId !== command.clientId ||
        (data.leaseExpiresAt ?? 0) <= now ||
        command.videoId !== data.currentVideo)
    )
      throw new SessionError('主持狀態已更新。', 409);
    if (kind === 'ended' || kind === 'advance') {
      if (!data.isPlaying || command.videoId !== data.currentVideo || command.expectedPlaybackRevision !== revision || command.trackEpoch !== (data.trackEpoch ?? 0) ||
        (kind === 'ended' && command.leaseTerm !== (data.leaseTerm ?? 0)))
        throw new SessionError('歌曲播放實例或主持租約已更新。', 409);
      const duration = playlist.find(song => song.videoId === data.currentVideo)?.durationMs;
      if (!duration || expectedSeconds(data, now) * 1000 < duration)
        throw new SessionError('權威時間線尚未到達這首歌的結尾。', 409);
    }
    if (!playlist.length) return {};
    const order = playbackOrder(data);
    const current = order.findIndex((item) => item.videoId === data.currentVideo);
    if (kind === 'ended' || kind === 'advance') {
      let index = current;
      let duration = order[index].durationMs ?? 0;
      let deadline = data.playbackUpdatedAt + duration - data.positionMs;
      // Bounded catch-up after suspension; anchors remain scheduled deadlines,
      // not request-arrival times, so loading/network delays never accumulate.
      for (let step = 0; step < 100; step++) {
        if (playlist.length === 1 || (!data.shuffle && index === playlist.length - 1)) {
          Object.assign(patch, { isPlaying: false, positionMs: duration, playbackUpdatedAt: deadline });
          break;
        }
        index = (index + 1) % order.length;
        changeTrack(order[index].videoId, deadline, step + 1);
        duration = order[index].durationMs ?? 0;
        if (!duration || deadline + duration > now) break;
        deadline += duration;
      }
    } else {
      const direction = kind === 'prev' ? -1 : 1;
      const index = current < 0
        ? (kind === 'prev' ? order.length - 1 : 0)
        : (current + direction + order.length) % order.length;
      changeTrack(order[index].videoId);
    }
  }
  if (kind === 'mode') {
    if (typeof command.shuffle !== 'boolean') throw new SessionError('播放模式不正確。');
    if (command.shuffle === data.shuffle) return {};
    patch.shuffle = command.shuffle;
    if (command.shuffle) patch.shuffleSeed = version + 1;
  }
  if (kind === 'permissions') {
    if (!owner) throw new SessionError('只有島主可以變更權限。', 403);
    if (
      !command.permissions ||
      Object.keys(command.permissions).length !== 3 ||
      (Object.keys(DEFAULT_PERMISSIONS) as (keyof Permissions)[]).some(
        (key) => typeof command.permissions[key] !== 'boolean',
      )
    )
      throw new SessionError('權限設定不完整。');
    patch.permissions = command.permissions;
    if (!command.permissions.guestsCanSkip && data.leaderUid !== data.ownerUid)
      Object.assign(patch, { leaderUid: '', leaderClientId: '', leaseExpiresAt: 0 });
  }
  if (kind === 'lease') {
    if (typeof command.clientId !== 'string' || !/^[a-zA-Z0-9-]{10,80}$/.test(command.clientId))
      throw new SessionError('連線識別碼不正確。');
    if (
      (data.leaseExpiresAt ?? 0) > now &&
      (data.leaderClientId !== command.clientId || data.leaderUid !== actor.uid)
    )
      return {};
    const sameLiveTerm = (data.leaseExpiresAt ?? 0) > now && data.leaderUid === actor.uid && data.leaderClientId === command.clientId;
    return { leaderClientId: command.clientId, leaderUid: actor.uid, leaseExpiresAt: now + 25000,
      leaseTerm: sameLiveTerm ? data.leaseTerm ?? 0 : (data.leaseTerm ?? 0) + 1 };
  }
  if (!Object.keys(patch).length) return {};
  const timelineChanged = ['currentVideo', 'positionMs', 'isPlaying', 'playbackUpdatedAt'].some(key => key in patch);
  return { ...patch, ...(timelineChanged ? { playbackRevision: revision + 1 } : {}), version: version + 1, lastChangedBy: actor.uid, updatedAt: now };
}
