import { expect, it } from 'vitest';
import { estimateClockOffset } from '../../lib/clock';

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
