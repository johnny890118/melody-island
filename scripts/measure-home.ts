declare global {
  interface Window {
    __baseline: { cls: number; lcp: number };
  }
}
// Local unthrottled production baseline, not a field Core Web Vitals audit.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.env.MELODY_PREVIEW_ORIGIN || 'http://127.0.0.1:3100';
if (new URL(origin).hostname !== '127.0.0.1')
  throw new Error('Only a local preview may be measured');
const browser = await chromium.launch({
  args: [
    '--enable-webgl',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const records = [];
try {
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__baseline = { cls: 0, lcp: 0 };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__baseline.lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (
            'hadRecentInput' in entry &&
            !entry.hadRecentInput &&
            'value' in entry &&
            typeof entry.value === 'number'
          )
            window.__baseline.cls += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(origin);
    await page.locator('canvas').waitFor({ state: 'visible' });
    await page.getByText('正在準備島嶼', { exact: false }).waitFor({ state: 'hidden' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    records.push(
      await page.evaluate((viewport) => {
        const resources = performance
          .getEntriesByType('resource')
          .filter((entry): entry is PerformanceResourceTiming => 'transferSize' in entry);
        return {
          viewport,
          scope:
            'local production build, no CPU/network throttling, software WebGL; LCP excludes Canvas readiness',
          fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
          lcpMs: window.__baseline.lcp,
          cls: window.__baseline.cls,
          observedSceneAndFontsReadyMs: performance.now(),
          transferBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
          model: resources
            .filter((resource) => resource.name.includes('/models/'))
            .map((resource) => ({
              url: new URL(resource.name).pathname,
              durationMs: resource.duration,
              transferBytes: resource.transferSize,
            })),
        };
      }, viewport),
    );
    await context.close();
  }
} finally {
  await browser.close();
}
await mkdir('docs/measurements', { recursive: true });
await writeFile('docs/measurements/home-local.json', JSON.stringify(records, null, 2) + '\n');
console.log(JSON.stringify(records, null, 2));
