import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { identity, login, post } from './helpers';
async function accessible(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    })),
  ).toEqual([]);
}
test('home and join dialog support keyboard, reduced motion and narrow screens', async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: '暫停場景動畫' })).toHaveCount(0);
  await expect(page.getByText('正在準備島嶼', { exact: false })).toHaveCount(0, { timeout: 30000 });
  await accessible(page);
  // macOS WebKit uses Option+Tab to include links in native keyboard traversal.
  await page.keyboard.press(
    browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab',
  );
  await expect(page.getByRole('link', { name: '跳至主要內容' })).toBeFocused();
  const trigger = page.getByRole('button', { name: '加入朋友的島嶼' });
  await trigger.click();
  await expect(page.getByLabel('島嶼 ID', { exact: true })).toBeFocused();
  await accessible(page);
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
      true,
    );
  }
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `.impeccable/review/home-narrow-reduced-${browserName}.png`,
    fullPage: true,
  });
});
test('room, permissions, long titles and join gate pass automated accessibility checks', async ({
  page,
  request,
  browserName,
}) => {
  const owner = await identity(request);
  const created = await post(request, '/api/islands', owner, {
    islandName: '一起聽海：很長的中文島嶼名稱與朋友分享旋律',
    islandPassword: 'friends-only-123',
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const added = await post(request, `/api/islands/${id}/commands`, owner, {
    type: 'add',
    song: { videoId: 'abcdefghijk', title: '很長的歌曲標題 Long song title '.repeat(6) },
    commandId: crypto.randomUUID(),
  });
  expect(added.status()).toBe(200);
  const image = readFileSync('public/music-island-logo.png');
  await page.route('**/_next/image?**', (route) =>
    route.fulfill({ contentType: 'image/png', body: image }),
  );
  await login(page, owner);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`/island/${id}`);
  await expect(page.getByTestId('test-player')).toBeVisible();
  await accessible(page);
  await page.locator('summary').click();
  await accessible(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `.impeccable/review/room-narrow-long-${browserName}.png`,
    fullPage: true,
  });
  await page.goto('/island/invalid');
  await expect(page.getByRole('heading', { name: '找不到這座島嶼' })).toBeVisible();
  await accessible(page);
});
test('failed model loading leaves room access usable and clears the loading status', async ({
  page,
  browserName,
}) => {
  await page.route('**/models/island.glb', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByText('島嶼暫時無法顯示')).toBeVisible();
  await expect(page.getByText('正在準備島嶼', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: '加入朋友的島嶼' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await accessible(page);
  await page.screenshot({
    path: `.impeccable/review/home-model-failure-${browserName}.png`,
    fullPage: true,
  });
});
