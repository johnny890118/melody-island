import { expect, it } from 'vitest';
import { estimateClockOffset, RoomClock } from '../../lib/clock';

it('ignores a cold-start-biased sample when a faster round trip is available', () => {
  expect(estimateClockOffset([
    { sentAt: 1000, receivedAt: 3000, serverNow: 3000 },
    { sentAt: 3100, receivedAt: 3140, serverNow: 3120 },
    { sentAt: 3200, receivedAt: 3280, serverNow: 3250 },
  ])).toBe(0);
});

it('preserves a real clock offset and rejects invalid or backwards-clock samples', () => {
  expect(estimateClockOffset([
    { sentAt: 1000, receivedAt: 900, serverNow: 1000 },
    { sentAt: 1000, receivedAt: 1040, serverNow: 1520 },
    { sentAt: NaN, receivedAt: 1040, serverNow: 1050 },
  ])).toBe(500);
  expect(estimateClockOffset([])).toBeUndefined();
});

it('uses monotonic time even if the device wall clock changes', async () => {
  const { RoomClock } = await import('../../lib/clock');
  let mono = 0;
  const clock = new RoomClock(() => mono, 1000);
  clock.calibrate(1000, 0, 0);
  mono = 1000; expect(clock.now()).toBe(2000);
  mono = 2000; expect(clock.now()).toBe(3000);
});
it('slews later clock corrections instead of jumping the media timeline', async () => {
  const { RoomClock } = await import('../../lib/clock');
  let mono = 0;
  const clock = new RoomClock(() => mono, 1000);
  clock.calibrate(1000, 0, 0);
  mono = 1000; clock.calibrate(10000, 1000, 1000);
  expect(clock.now()).toBe(2000);
  mono = 2000; expect(clock.now()).toBe(3020);
  clock.calibrate(500, 2000, 2000);
  mono = 3000; expect(clock.now()).toBe(4000);
});
it('extrapolates the best round-trip sample to the time calibration actually commits', async () => {
  const { RoomClock } = await import('../../lib/clock');
  const clock = new RoomClock(() => 200, 0);
  clock.calibrate(1000, 0, 100);
  expect(clock.now()).toBe(1150);
  expect(clock.uncertaintyMs).toBe(50);
});
it('rebases from a fresh server sample after sleep instead of slewing a missing sleep interval', () => {
  let mono = 1000;
  const clock = new RoomClock(() => mono, 100000);
  clock.calibrate(100000, mono, mono);
  mono += 1000;
  expect(clock.now()).toBe(101000);
  // Some platforms do not advance performance.now through device sleep.
  clock.invalidate();
  expect(clock.uncertaintyMs).toBe(Infinity);
  clock.calibrate(701000, mono, mono);
  expect(clock.now()).toBe(701000);
});
