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

/** Epoch time advances from a monotonic counter; wall-clock corrections cannot seek media. */
export class RoomClock {
  private epoch: number;
  private mono: number;
  private correction = 0;
  uncertaintyMs = Infinity;
  constructor(private readonly monotonic: () => number = () => performance.now(), wallNow = Date.now()) {
    this.epoch = wallNow;
    this.mono = monotonic();
  }
  now(): number {
    const mono = this.monotonic();
    const elapsed = Math.max(0, mono - this.mono);
    // Slew later calibrations at at most 20ms per elapsed second, never jump backwards.
    const adjustment = Math.sign(this.correction) * Math.min(Math.abs(this.correction), elapsed * 0.02);
    this.epoch += elapsed + adjustment;
    this.correction -= adjustment;
    this.mono = mono;
    return this.epoch;
  }
  invalidate(): void { this.uncertaintyMs = Infinity; }
  calibrate(serverNow: number, sentMono: number, receivedMono: number): void {
    if (![serverNow, sentMono, receivedMono].every(Number.isFinite) || receivedMono < sentMono) return;
    const uncertainty = (receivedMono - sentMono) / 2;
    const estimated = serverNow + uncertainty + Math.max(0, this.monotonic() - receivedMono);
    const current = this.now();
    if (!Number.isFinite(this.uncertaintyMs)) {
      this.epoch = estimated;
      this.correction = 0;
    } else this.correction = estimated - current;
    this.uncertaintyMs = uncertainty;
  }
}
