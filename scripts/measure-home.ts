declare global {
  interface Window {
    __baseline: { cls: number; lcp: number; longTasks: number[] };
  }
}
// Local production measurements; throttling is a synthetic profile, not a real device or field audit.
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
const throttled = process.env.MELODY_THROTTLED === 'true';
const repetitions = throttled ? 3 : 1;
const records = [];
try {
  for (let run = 1; run <= repetitions; run++) {
    for (const viewport of [
      { width: 1440, height: 960 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage();
      if (throttled) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 150,
          downloadThroughput: 200000,
          uploadThroughput: 93750,
        });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      }
      await page.addInitScript(() => {
        window.__baseline = { cls: 0, lcp: 0, longTasks: [] };
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) window.__baseline.longTasks.push(entry.duration);
        }).observe({ type: 'longtask', buffered: true });
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
      await page.goto(origin, { timeout: 90000 });
      await page.locator('canvas').waitFor({ state: 'visible' });
      await page
        .getByText('正在準備島嶼', { exact: false })
        .waitFor({ state: 'hidden', timeout: 90000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      records.push(
        await page.evaluate(
          ({ viewport, throttled, run }) => {
            const resources = performance
              .getEntriesByType('resource')
              .filter((entry): entry is PerformanceResourceTiming => 'transferSize' in entry);
            return {
              viewport,
              run,
              scope: throttled
                ? 'localhost production, cold HTTP cache, 4x CPU slowdown, 1.6Mbps down/0.75Mbps up, 150ms latency, software WebGL; synthetic, not a real device; LCP excludes Canvas readiness'
                : 'local production build, no CPU/network throttling, software WebGL; LCP excludes Canvas readiness',
              longTaskTotalMs: window.__baseline.longTasks.reduce(
                (sum, duration) => sum + duration,
                0,
              ),
              longestTaskMs: Math.max(0, ...window.__baseline.longTasks),
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
          },
          { viewport, throttled, run },
        ),
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await mkdir('docs/measurements', { recursive: true });
await writeFile(
  `docs/measurements/home-${throttled ? 'throttled' : 'local'}.json`,
  JSON.stringify(records, null, 2) + '\n',
);
console.log(JSON.stringify(records, null, 2));
