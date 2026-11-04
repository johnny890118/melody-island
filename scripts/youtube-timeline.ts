// Browser-only observation inside the real cross-origin iframe. Never use as an app API.
import { expect, type Page } from '@playwright/test';

function playerVideo(page: Page) {
  return page.frameLocator('.video-frame iframe').locator('video');
}

async function sample(page: Page) {
  return playerVideo(page).evaluate(
    (element) => {
      if (!(element instanceof HTMLVideoElement)) throw new Error('Missing media element');
      return {
        seconds: element.currentTime,
        paused: element.paused,
        readyState: element.readyState,
        observedAtMs: performance.timeOrigin + performance.now(),
      };
    },
    undefined,
    { timeout: 1500 },
  );
}

async function waitForPlayback(page: Page) {
  await expect
    .poll(
      async () => {
        const unblock = page.getByRole('button', { name: '點擊啟用音訊' });
        if (await unblock.isVisible()) await unblock.click({ timeout: 1500 }).catch(() => {});
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
