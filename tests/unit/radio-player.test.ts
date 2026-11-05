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
