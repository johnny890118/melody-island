import { expect, it } from 'vitest';
import { RadioPlayer, type RadioAuthority, type MediaObservation, type RadioTrigger } from '../../lib/radio-player';
const base: RadioAuthority = { currentVideo: 'aaaaaaaaaaa', positionMs: 0, playbackUpdatedAt: 1000,
  isPlaying: true, playbackRevision: 1, trackEpoch: 1, durationMs: 600000, leaseTerm: 1 };
const media = (seconds: number, state = 1, duration = 600): MediaObservation => ({ seconds, state, duration, videoId: 'aaaaaaaaaaa' });
function step(player: RadioPlayer, mono: number, observation = media(mono / 1000),
  authority = base, trigger: RadioTrigger = 'tick', canRelay = true) {
  return player.decide(authority, observation, 1000 + mono, mono, 0, trigger, canRelay);
}
it('loads once across two minutes of ordinary metadata and lease updates', () => {
  const player = new RadioPlayer();
  expect(step(player, 0).map(a => a.type)).toEqual(['load']);
  for (let t = 1000; t <= 120000; t += 1000)
    expect(step(player, t, media(t / 1000), { ...base, version: t, leaseExpiresAt: t + 25000 })).toEqual([]);
  expect(player.diagnostics().counts).toEqual({ load: 1 });
});
it('rejects stale and inconsistent timeline snapshots without restarting content', () => {
  const player = new RadioPlayer(); step(player, 0);
  expect(step(player, 1000, media(1), { ...base, playbackRevision: 0, positionMs: 0 })).toEqual([]);
  expect(step(player, 2000, media(2), { ...base, positionMs: 50000 })).toEqual([]);
  expect(player.diagnostics().trace.at(-1)?.reason).toBe('conflicting-same-revision-snapshot-ignored');
});
it('explicit same-video replay uses an instance-fenced seek, not resource reload', () => {
  const player = new RadioPlayer(); step(player, 0); step(player, 1000);
  const actions = step(player, 30000, media(30), { ...base, playbackRevision: 2, trackEpoch: 2, playbackUpdatedAt: 31000 });
  expect(actions.map(a => a.type)).toEqual(['seek']);
  expect(actions[0]).toMatchObject({ seconds: 0, reason: 'explicit-authoritative-playback-instance' });
});
it('keeps all media commands silent throughout a ten-second buffer, then aligns once after healthy progress', () => {
  const player = new RadioPlayer(); step(player, 0);
  for (let t = 1000; t <= 10000; t += 1000) expect(step(player, t, media(0, 3))).toEqual([]);
  const actions = [step(player, 11000, media(1)), step(player, 12000, media(2)), step(player, 13000, media(3))].flat();
  expect(actions).toHaveLength(1); expect(actions[0]).toMatchObject({ type: 'seek', seconds: 13 });
  for (let t = 14000; t <= 30000; t += 1000) expect(step(player, t, media(t / 1000))).toEqual([]);
});
it('does not issue another seek while an earlier seek has not been acknowledged', () => {
  const player = new RadioPlayer(); step(player, 0);
  step(player, 10000, media(0, 3));
  step(player, 11000, media(1)); step(player, 12000, media(2)); step(player, 13000, media(3));
  for (let t = 14000; t <= 26000; t += 1000) expect(step(player, t, media((t - 10000) / 1000))).toEqual([]);
  expect(player.diagnostics().counts.seek).toBe(1);
});
it('does not chase an advertising-like duration or treat its ended event as authority', () => {
  const player = new RadioPlayer(); step(player, 0);
  expect(step(player, 100000, media(5, 1, 10))).toEqual([]);
  expect(step(player, 105000, media(10, 0, 10))).toEqual([]);
  expect(player.diagnostics().counts.complete).toBeUndefined();
});
it('the authoritative deadline advances even when the local listener is buffering or blocked', () => {
  const player = new RadioPlayer(); step(player, 0); player.block(1000);
  const actions = step(player, 600000, media(0, 3));
  expect(actions.map(a => a.type)).toEqual(['complete']);
  expect(actions[0]).toMatchObject({ reason: 'authoritative-content-deadline' });
  expect(step(player, 601000, media(0, 3))).toEqual([]);
});
it('a disconnected snapshot cannot relay until the connection is current', () => {
  const player = new RadioPlayer(); step(player, 0);
  expect(step(player, 600000, media(0, 3), base, 'tick', false)).toEqual([]);
  expect(step(player, 601000, media(0, 3), { ...base, leaseTerm: 2 }, 'snapshot', true)[0]).toMatchObject({ type: 'complete' });
});
it('an early local ended event never reloads or starts the old song', () => {
  const player = new RadioPlayer(); step(player, 0);
  for (let t = 10000; t < 50000; t += 1000) expect(step(player, t, media(599, 0))).toEqual([]);
});
it('a local activation gesture joins the latest position without producing a completion command', () => {
  const player = new RadioPlayer(); step(player, 0); player.block(1000);
  expect(step(player, 20000, media(0, 2))).toEqual([]);
  expect(step(player, 21000, media(0, 2), base, 'activate')).toEqual([
    { type: 'seek', seconds: 21, reason: 'local-gesture-joins-live-timeline' },
    { type: 'play', reason: 'explicit-local-listening-gesture' },
  ]);
});
it('reports a locally paused device once rather than issuing polling play storms', () => {
  const player = new RadioPlayer(); step(player, 0); step(player, 1000, media(1));
  expect(step(player, 2000, media(2, 2))[0]).toMatchObject({ type: 'blocked' });
  for (let t = 3000; t < 30000; t += 1000) expect(step(player, t, media(2, 2))).toEqual([]);
  expect(player.diagnostics().counts.play).toBeUndefined();
});
it('waits for clock calibration without loading a video at a potentially wrong device time', () => {
  const player = new RadioPlayer();
  expect(player.decide(base, media(0), 99999999999, 0, Infinity, 'snapshot')).toEqual([]);
  expect(step(player, 1000).map(a => a.type)).toEqual(['load']);
});
it('retries an unacknowledged deadline command without allowing concurrent requests', () => {
  const player = new RadioPlayer(); step(player, 0);
  const action = step(player, 600000, media(600, 0))[0];
  if (action.type !== 'complete') throw Error('Missing completion');
  expect(step(player, 600100, media(600, 0))).toEqual([]);
  player.completionResult(action.key, false, 600100);
  expect(step(player, 600500, media(600, 0))).toEqual([]);
  expect(step(player, 601200, media(600, 0))[0]).toMatchObject({ type: 'complete' });
  player.completionResult(action.key, true, 601300);
  expect(step(player, 610000, media(600, 0))).toEqual([]);
});
it('deadline relay works without any attached media player', () => {
  const player = new RadioPlayer();
  const actions = player.decide(base, { state: -1, seconds: NaN, duration: NaN, videoId: '' }, 601000, 600000, 0, 'tick', true, false);
  expect(actions[0]).toMatchObject({ type: 'complete', reason: 'authoritative-content-deadline' });
});
it('reconnection renews local alignment after an earlier unacknowledged correction', () => {
  const player = new RadioPlayer(); step(player, 0);
  step(player, 10000, media(0, 3));
  for (let t = 11000; t <= 26000; t += 1000) step(player, t, media((t - 10000) / 1000));
  expect(player.diagnostics().counts.seek).toBe(1);
  step(player, 30000, media(20), base, 'reconnect');
  step(player, 31000, media(21));
  expect(step(player, 32000, media(22))).toContainEqual({ type: 'seek', seconds: 32, reason: 'stable-content-joins-authoritative-timeline' });
});
it('issues resume even when the iframe still reports playing before its delayed pause acknowledgement', () => {
  const player = new RadioPlayer(); step(player, 0); step(player, 1000, media(1));
  const paused = { ...base, isPlaying: false, positionMs: 1000, playbackRevision: 2, playbackUpdatedAt: 2000 };
  expect(step(player, 1100, media(1.1), paused).some(action => action.type === 'pause')).toBe(true);
  const resumed = { ...paused, isPlaying: true, playbackRevision: 3, playbackUpdatedAt: 2200 };
  expect(step(player, 1200, media(1.1), resumed).some(action => action.type === 'play')).toBe(true);
  expect(step(player, 1300, media(1.1, 2), resumed).some(action => action.type === 'blocked')).toBe(false);
});
it('waits for resume acknowledgement instead of classifying a stale paused observation as autoplay rejection', () => {
  const player = new RadioPlayer();
  const paused = { ...base, isPlaying: false, positionMs: 1000, playbackRevision: 2, playbackUpdatedAt: 2000 };
  step(player, 1000, media(1, 2), paused);
  const resumed = { ...paused, isPlaying: true, playbackRevision: 3, playbackUpdatedAt: 2200 };
  expect(step(player, 1200, media(1, 2), resumed).some(action => action.type === 'play')).toBe(true);
  expect(step(player, 1300, media(1, 2), resumed)).toEqual([]);
  expect(step(player, 2200, media(2), resumed).some(action => action.type === 'blocked')).toBe(false);
});
it('retains a resume intent while clock calibration is unavailable', () => {
  const player = new RadioPlayer();
  const paused = { ...base, isPlaying: false, positionMs: 1000, playbackRevision: 2, playbackUpdatedAt: 2000 };
  step(player, 1000, media(1, 2), paused);
  const resumed = { ...paused, isPlaying: true, playbackRevision: 3, playbackUpdatedAt: 2200 };
  expect(player.decide(resumed, media(1, 2), 2200, 1200, Infinity, 'snapshot')).toEqual([]);
  expect(step(player, 1300, media(1, 2), resumed).some(action => action.type === 'play')).toBe(true);
});
it('does not classify ten seconds of acknowledged buffering as a rejected resume', () => {
  const player = new RadioPlayer();
  const paused = { ...base, isPlaying: false, positionMs: 1000, playbackRevision: 2, playbackUpdatedAt: 2000 };
  step(player, 1000, media(1, 2), paused);
  const resumed = { ...paused, isPlaying: true, playbackRevision: 3, playbackUpdatedAt: 2200 };
  expect(step(player, 1200, media(1, 3), resumed).map(action => action.type)).toEqual(['play']);
  for (let t = 2200; t <= 12200; t += 1000) expect(step(player, t, media(1, 3), resumed)).toEqual([]);
  expect(step(player, 12300, media(1, 2), resumed)).toEqual([]);
  expect(step(player, 13200, media(2), resumed).some(action => action.type === 'blocked')).toBe(false);
  expect(player.diagnostics().counts.play).toBe(1);
});
it('does not deliver a second resume when an explicit replay also changes the epoch', () => {
  const player = new RadioPlayer();
  const paused = { ...base, isPlaying: false, positionMs: 60000, playbackRevision: 2, playbackUpdatedAt: 2000 };
  step(player, 1000, media(60, 2), paused);
  const replay = { ...paused, isPlaying: true, positionMs: 0, playbackRevision: 3, trackEpoch: 2, playbackUpdatedAt: 2200 };
  expect(step(player, 1200, media(60, 2), replay).map(action => action.type)).toEqual(['seek', 'play']);
  expect(step(player, 1300, media(0, 2), replay)).toEqual([]);
  expect(step(player, 2200, media(1), replay)).toEqual([]);
  expect(player.diagnostics().counts).toEqual({ cue: 1, seek: 1, play: 1 });
});
it('discards an old play acknowledgement when a newer same-video replay replaces it', () => {
  const player = new RadioPlayer();
  const paused = { ...base, isPlaying: false, positionMs: 60000, playbackRevision: 2, playbackUpdatedAt: 2000 };
  step(player, 1000, media(60, 2), paused);
  const resume = { ...paused, isPlaying: true, playbackRevision: 3, playbackUpdatedAt: 2200 };
  step(player, 1200, media(60, 2), resume);
  const replay = { ...resume, positionMs: 0, playbackRevision: 4, trackEpoch: 2, playbackUpdatedAt: 2300 };
  expect(step(player, 1300, media(60), replay).map(action => action.type)).toEqual(['seek']);
  for (let t = 2300; t <= 12300; t += 1000) expect(step(player, t, media((t - 1300) / 1000), replay).some(action => action.type === 'blocked')).toBe(false);
});
it('recognizes a native iframe listening gesture from content progress and allows a later room resume', () => {
  const player = new RadioPlayer(); step(player, 0); player.block(100);
  expect(step(player, 1000, media(1))).toEqual([]);
  expect(step(player, 2000, media(2))).toEqual([]);
  expect(player.diagnostics().phase).toBe('playing');
  const paused = { ...base, isPlaying: false, positionMs: 2000, playbackUpdatedAt: 3100, playbackRevision: 2 };
  step(player, 2100, media(2.1), paused);
  const resumed = { ...paused, isPlaying: true, playbackUpdatedAt: 3200, playbackRevision: 3 };
  expect(step(player, 2200, media(2.1, 2), resumed).map(action => action.type)).toEqual(['play']);
});
