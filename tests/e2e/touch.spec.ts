import { test, expect } from '@playwright/test';
test('touch rotates the real island horizontally while vertical swipes still scroll', async ({
  browser,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'CDP touch synthesis is Chromium-specific.');
  const context = await browser.newContext({
    viewport: { width: 390, height: 560 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  try {
    const page = await context.newPage();
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    await expect(page.getByText('正在準備島嶼', { exact: false })).toHaveCount(0, {
      timeout: 30000,
    });
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Missing real canvas');
    const x = 170;
    const y = Math.min(bounds.y + bounds.height / 2, 600);
    const cdp = await context.newCDPSession(page);
    const swipe = async (dx: number, dy: number) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 8; step++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x + (dx * step) / 8, y: y + (dy * step) / 8 }],
        });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const pixels = () => canvas.screenshot();
    const before = await pixels();
    await swipe(100, 0);
    await expect.poll(async () => !(await pixels()).equals(before)).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await swipe(0, -150);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(50);
    await page.evaluate(() => scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + 25, y }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    // An interrupted page-scroll gesture must not leave OrbitControls stuck.
    const afterScroll = await pixels();
    await swipe(-80, 0);
    await expect.poll(async () => !(await pixels()).equals(afterScroll)).toBe(true);
    await page.screenshot({ path: '.impeccable/review/home-touch.png', fullPage: true });
  } finally {
    await context.close();
  }
});
