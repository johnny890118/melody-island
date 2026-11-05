export interface ClockSample {
  sentAt: number;
  receivedAt: number;
  serverNow: number;
}

/** The shortest round trip is least affected by cold starts and token preparation. */
export function estimateClockOffset(samples: readonly ClockSample[]): number | undefined {
  let best: ClockSample | undefined;
  for (const sample of samples) {
    if (
      !Number.isFinite(sample.sentAt) ||
      !Number.isFinite(sample.receivedAt) ||
      !Number.isFinite(sample.serverNow) ||
      sample.receivedAt < sample.sentAt
    ) continue;
    if (!best || sample.receivedAt - sample.sentAt < best.receivedAt - best.sentAt)
      best = sample;
  }
  return best ? best.serverNow - (best.sentAt + best.receivedAt) / 2 : undefined;
}
