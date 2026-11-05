import type { Room, Song } from '../../lib/types';
import { parseCommand } from '../../lib/validation';
import { describe, it, expect } from 'vitest';
import {
  applyCommand,
  expectedSeconds,
  timestampToMillis,
  assertRoomId,
  DEFAULT_PERMISSIONS,
} from '../../lib/session';
const song = (id: string): Song => ({
  videoId: id,
  title: id,
  thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
  durationMs: 60000,
});
const ids = ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'];
const room = (overrides: Partial<Room> = {}): Room => ({
  id: 'abcdefghij',
  name: 'Test island',
  schemaVersion: 2,
  memberCount: 1,
  memberUids: ['owner'],
  members: { owner: { uid: 'owner', role: 'owner', displayName: 'Owner', joinedAt: 1000 } },
  shuffle: false,
  updatedAt: 1000,
  ownerUid: 'owner',
  playlist: ids.map(song),
  currentVideo: ids[0],
  version: 4,
  positionMs: 2000,
  playbackUpdatedAt: 1000,
  isPlaying: true,
  permissions: DEFAULT_PERMISSIONS,
  ...overrides,
});
const actor = { uid: 'guest' };
const command = (type: string, extra: Record<string, unknown> = {}) =>
  parseCommand({ type, expectedVersion: 4,
    ...(type === 'ended' ? { expectedPlaybackRevision: 0, trackEpoch: 0, leaseTerm: 0 } : {}), ...extra });
describe('timeline', () => {
  it('uses server anchor, including timestamp nanoseconds', () => {
    expect(timestampToMillis({ seconds: 2, nanoseconds: 500000000 })).toBe(2500);
    expect(expectedSeconds(room(), 4000)).toBe(5);
  });
  it('does not advance paused or missing-anchor sessions', () => {
    expect(expectedSeconds(room({ isPlaying: false }), 4000)).toBe(2);
    expect(expectedSeconds(room({ playbackUpdatedAt: 0 }), 4000)).toBe(2);
  });
  it('clamps negative elapsed and invalid positions', () => {
    expect(expectedSeconds(room({ positionMs: NaN }), 0)).toBe(0);
  });
});
describe('commands under concurrency', () => {
  it('deletes by identity after another client deleted an earlier row', () => {
    const first = applyCommand(room(), command('remove', { videoId: ids[0] }), actor, 5000);
    const second = applyCommand(
      { ...room(), ...first },
      command('remove', { videoId: ids[1] }),
      actor,
      5001,
    );
    expect(second.playlist?.map((song) => song.videoId)).toEqual([ids[2]]);
  });
  it('does not delete a different item on retry', () =>
    expect(applyCommand(room(), command('remove', { videoId: 'notpresent1' }), actor)).toEqual({}));
  it('preserves paused state when deleting current song', () => {
    const patch = applyCommand(
      room({ isPlaying: false }),
      command('remove', { videoId: ids[0] }),
      actor,
      5000,
    );
    expect(patch.currentVideo).toBe(ids[1]);
    expect(patch.isPlaying).toBe(false);
  });
  it('stops when removing the last track', () => {
    const patch = applyCommand(
      room({ playlist: [song(ids[0])] }),
      command('remove', { videoId: ids[0] }),
      actor,
      5000,
    );
    expect(patch.currentVideo).toBe('');
    expect(patch.isPlaying).toBe(false);
  });
  it('rejects stale playback commands', () =>
    expect(() => applyCommand(room({ version: 5 }), command('pause'), actor)).toThrow(
      '播放狀態已更新',
    ));
  it('does not trust a lagging client playhead', () => {
    const patch = applyCommand(room(), command('pause', { positionMs: 999999 }), actor, 4000);
    expect(patch.positionMs).toBe(5000);
  });
  it('requires actual boolean shuffle', () =>
    expect(() => applyCommand(room(), command('mode', { shuffle: 'true' }), actor)).toThrow());
  it('rejects duplicate songs and untrusted thumbnails', () => {
    expect(() => applyCommand(room(), command('add', { song: song(ids[0]) }), actor)).toThrow(
      '已在佇列',
    );
    const patch = applyCommand(
      room({ playlist: [] }),
      command('add', { song: { ...song(ids[0]), thumbnail: 'https://evil.test' } }),
      actor,
    );
    expect(patch.playlist?.[0].thumbnail).toBe(`https://i.ytimg.com/vi/${ids[0]}/mqdefault.jpg`);
  });
});
describe('authorization and leadership', () => {
  it('rejects guests when permissions are closed', () =>
    expect(() =>
      applyCommand(
        room({ permissions: { ...DEFAULT_PERMISSIONS, guestsCanEditQueue: false } }),
        command('remove', { videoId: ids[0] }),
        actor,
      ),
    ).toThrow('權限'));
  it('never equates empty identity with owner', () =>
    expect(() =>
      applyCommand(
        room({ ownerUid: '', permissions: { ...DEFAULT_PERMISSIONS, guestsCanSkip: false } }),
        command('next'),
        {
          uid: '',
        },
      ),
    ).toThrow());
  it('only allows owner to change permissions', () =>
    expect(() =>
      applyCommand(room(), command('permissions', { permissions: DEFAULT_PERMISSIONS }), actor),
    ).toThrow('只有島主'));
  it('validates unknown permission fields', () =>
    expect(() =>
      applyCommand(
        room(),
        command('permissions', { permissions: { ...DEFAULT_PERMISSIONS, surprise: true } }),
        { uid: 'owner' },
      ),
    ).toThrow('不完整'));
  it('cannot bypass skip restrictions by claiming leadership', () =>
    expect(() =>
      applyCommand(
        room({ permissions: { ...DEFAULT_PERMISSIONS, guestsCanSkip: false } }),
        command('lease', { clientId: 'guest-client-id' }),
        actor,
      ),
    ).toThrow());
  it('cannot advance a paused session through ended', () =>
    expect(() =>
      applyCommand(
        room({
          isPlaying: false,
          leaderUid: 'guest',
          leaderClientId: 'guest-client-id',
          leaseExpiresAt: 9000,
        }),
        command('ended', { clientId: 'guest-client-id', videoId: ids[0] }),
        actor,
        5000,
      ),
    ).toThrow());
  it('does not steal an active leader lease', () =>
    expect(
      applyCommand(
        room({ leaderClientId: 'other-client', leaseExpiresAt: 9000 }),
        command('lease', { clientId: 'new-client-id' }),
        actor,
        5000,
      ),
    ).toEqual({}));
  it('allows a guest to take over an expired lease', () =>
    expect(
      applyCommand(
        room({ leaderClientId: 'old-client', leaseExpiresAt: 4000 }),
        command('lease', { clientId: 'new-client-id' }),
        actor,
        5000,
      ).leaderClientId,
    ).toBe('new-client-id'));
  it('rejects old and duplicate ended events', () => {
    const current = room({
      leaderUid: 'guest',
      leaderClientId: 'leader-client',
      leaseExpiresAt: 90000,
    });
    expect(() =>
      applyCommand(
        current,
        command('ended', { clientId: 'old-client', videoId: ids[0] }),
        actor,
        5000,
      ),
    ).toThrow();
    const next = applyCommand(
      current,
      command('ended', { clientId: 'leader-client', videoId: ids[0] }),
      actor,
      61000,
    );
    expect(next.currentVideo).toBe(ids[1]);
    expect(() =>
      applyCommand(
        { ...current, ...next },
        command('ended', { clientId: 'leader-client', videoId: ids[0] }),
        actor,
        61001,
      ),
    ).toThrow();
  });
  it('rejects a member impersonating a readable leader client ID', () =>
    expect(() =>
      applyCommand(
        room({ leaderUid: 'owner', leaderClientId: 'leader-client', leaseExpiresAt: 9000 }),
        command('ended', { clientId: 'leader-client', videoId: ids[0] }),
        actor,
        5000,
      ),
    ).toThrow());
  it('rejects malformed room ids', () => {
    expect(() => assertRoomId('../secrets')).toThrow();
    expect(assertRoomId('abcDEF_123')).toBe('abcDEF_123');
  });
});

describe('radio reliability regressions', () => {
  it('treats repeated play as a no-op instead of creating a new timeline anchor', () => {
    expect(applyCommand(room(), command('play'), actor, 5000)).toEqual({});
  });
  it('rejects premature completion against the admitted content duration', () => {
    const content = { ...song(ids[0]), durationMs: 300000 };
    expect(() => applyCommand(room({
      playlist: [content], leaderUid: actor.uid, leaderClientId: 'radio-client-id',
      leaseExpiresAt: 20000,
    }), command('ended', { clientId: 'radio-client-id', videoId: ids[0] }), actor, 5000)).toThrow();
  });
  it('finishes a single-song queue without implicitly replaying it', () => {
    const content = { ...song(ids[0]), durationMs: 60000 };
    const result = applyCommand(room({ playlist: [content], positionMs: 0,
      leaderUid: actor.uid, leaderClientId: 'radio-client-id', leaseExpiresAt: 100000,
    }), command('ended', { clientId: 'radio-client-id', videoId: ids[0] }), actor, 61000);
    expect(result.isPlaying).toBe(false);
    expect(result.positionMs).toBe(60000);
  });
});

describe('server-authoritative deadline protocol', () => {
  const advance = (extra: Record<string, unknown> = {}) => parseCommand({ type: 'advance', videoId: ids[0], expectedPlaybackRevision: 0, trackEpoch: 0, ...extra });
  it('allows a member to relay an expired deadline without manual skip rights or a leader lease', () => {
    const state = room({ permissions: { ...DEFAULT_PERMISSIONS, guestsCanSkip: false }, leaderUid: 'offline-owner', leaderClientId: 'offline-client', leaseExpiresAt: 90000 });
    const patch = applyCommand(state, advance(), actor, 61000);
    expect(patch.currentVideo).toBe(ids[1]); expect(patch.playbackUpdatedAt).toBe(59000);
    expect(() => applyCommand(state, command('next'), actor, 61000)).toThrow('權限');
  });
  it('rejects an early deadline even when a local player says ended', () => {
    expect(() => applyCommand(room(), advance(), actor, 5000)).toThrow('尚未到達');
  });
  it('fences the playback instance independently of same video identity', () => {
    expect(() => applyCommand(room({ trackEpoch: 2 }), advance({ trackEpoch: 1 }), actor, 61000)).toThrow();
  });
  it('ignores unrelated room version changes while accepting the exact timeline revision', () => {
    const patch = applyCommand(room({ version: 99 }), advance(), actor, 61000);
    expect(patch.currentVideo).toBe(ids[1]); expect(patch.version).toBe(100); expect(patch.playbackRevision).toBe(1);
  });
  it('catches up multiple elapsed tracks atomically using scheduled anchors', () => {
    const patch = applyCommand(room(), advance(), actor, 180000);
    expect(patch).toMatchObject({ currentVideo: ids[2], isPlaying: false, positionMs: 60000, playbackUpdatedAt: 179000, trackEpoch: 2, playbackRevision: 1 });
  });
  it('an explicit play after the finite queue finished starts a new playback instance', () => {
    const patch = applyCommand(room({ isPlaying: false, positionMs: 60000 }), command('play'), actor, 100000);
    expect(patch).toMatchObject({ isPlaying: true, positionMs: 0, playbackUpdatedAt: 100000, trackEpoch: 1 });
  });
});
