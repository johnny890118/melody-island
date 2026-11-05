// Browser-only observation inside the real cross-origin iframe. Never use as an app API.
import { expect, type Page } from '@playwright/test';

export async function observePlayerCommands(page: Page) {
  await page.addInitScript(() => {
    const counts: Record<string, number> = {};
    Object.defineProperty(window, '__melodyObservedCommands', { value: counts });
    window.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const data: unknown = JSON.parse(event.data);
        if (!data || typeof data !== 'object' || !('event' in data) || data.event !== 'command' ||
            !('func' in data) || typeof data.func !== 'string') return;
        counts[data.func] = (counts[data.func] || 0) + 1;
      } catch { /* Other iframe messages are outside this measurement. */ }
    });
  });
}

function playerVideo(page: Page) {
  return page.frameLocator('.video-frame iframe').locator('video');
}

export async function sample(page: Page) {
  return playerVideo(page).evaluate(
    (element) => {
      if (!(element instanceof HTMLVideoElement)) throw new Error('Missing media element');
      return {
        seconds: element.currentTime,
        commands: (window as unknown as { __melodyObservedCommands?: Record<string, number> })
          .__melodyObservedCommands || {},
        duration: element.duration,
        paused: element.paused,
        readyState: element.readyState,
        observedAtMs: performance.timeOrigin + performance.now(),
      };
    },
    undefined,
    { timeout: 1500 },
  );
}

export async function waitForPlayback(page: Page) {
  let activated = false;
  await expect
    .poll(
      async () => {
        const unblock = page.getByRole('button', { name: /點擊啟用音訊|開始聆聽/ });
        if (!activated && await unblock.isVisible()) {
          await unblock.click({ timeout: 1500 });
          activated = true;
        }
        const point = await sample(page).catch(() => null);
        return !!point && !point.paused && point.readyState >= 2 && point.seconds > 0;
      },
      { timeout: 18000 },
    )
    .toBe(true);
}

export async function measureTimeline(owner: Page, guest: Page) {
  await owner.getByRole('button', { name: '播放', exact: true }).click();
  await Promise.all([waitForPlayback(owner), waitForPlayback(guest)]);
  const samples = [];
  for (let index = 0; index < 5; index++) {
    const [first, second] = await Promise.all([sample(owner), sample(guest)]);
    const observationGapMs = second.observedAtMs - first.observedAtMs;
    if (first.paused || second.paused || Math.abs(observationGapMs) > 250)
      throw new Error('The players did not provide a comparable playback sample.');
    samples.push({
      ownerSeconds: first.seconds,
      ownerSeekCommands: first.commands.seekTo || 0,
      guestSeekCommands: second.commands.seekTo || 0,
      guestSeconds: second.seconds,
      observationGapMs,
      timelineDifferenceMs: Math.round(
        Math.abs((second.seconds - first.seconds) * 1000 - observationGapMs),
      ),
    });
    if (index < 4)
      await owner.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 1000)));
  }
  if (
    samples[4].ownerSeconds <= samples[0].ownerSeconds ||
    samples[4].guestSeconds <= samples[0].guestSeconds
  )
    throw new Error('Media clocks did not progress in both clients.');
  await owner.getByRole('button', { name: '暫停', exact: true }).click();
  await expect
    .poll(
      async () => {
        const [first, second] = await Promise.all([sample(owner), sample(guest)]);
        return first.paused && second.paused;
      },
      { timeout: 10000 },
    )
    .toBe(true);
  return samples;
}

export async function measureRecovery(owner: Page, guest: Page, releasedAt: number) {
  const points = [];
  for (let index = 0; index < 9; index++) {
    const [first, second] = await Promise.all([sample(owner), sample(guest)]);
    const difference = Math.round(Math.abs(
      (second.seconds - first.seconds) * 1000 - (second.observedAtMs - first.observedAtMs),
    ));
    points.push({
      afterReleaseMs: Date.now() - releasedAt,
      timelineDifferenceMs: difference,
      bothPlaying: !first.paused && !second.paused && first.readyState >= 2 && second.readyState >= 2,
      ownerSeekCommands: first.commands.seekTo || 0,
      guestSeekCommands: second.commands.seekTo || 0,
    });
    if (index < 8)
      await owner.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 1000)));
  }
  return points;
}
