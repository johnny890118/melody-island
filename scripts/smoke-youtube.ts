// Opt-in network smoke check: uses the real iframe API with demo room data.
// It does not establish audible playback, inter-device drift, or Safari/iPhone compatibility.
import { chromium, webkit, request as playwrightRequest, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { adminDb, identity, login, post } from '../tests/e2e/helpers';
const api = await playwrightRequest.newContext();
const records = [];
try {
  // adminDb rejects non-local emulator endpoints before any identity/room is created.
  const db = adminDb();
  const owner = await identity(api);
  const response = await post(api, '/api/islands', owner, { islandName: 'Real iframe smoke — synthetic room', islandPassword: 'synthetic-only-123' });
  if (response.status() !== 201) throw new Error('Demo preview did not create the synthetic room.');
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !('id' in payload) || typeof payload.id !== 'string') throw new Error('Invalid room response');
  const id = payload.id;
  try {
    const added = await post(api, `/api/islands/${id}/commands`, owner, { type: 'add', song: { videoId: 'M7lc1UVf-VE', title: 'YouTube IFrame API official sample' }, commandId: crypto.randomUUID() });
    if (added.status() !== 200) throw new Error('Could not seed the official iframe sample.');
    for (const command of [
      { type: 'select', videoId: 'M7lc1UVf-VE', expectedVersion: 1 },
      { type: 'pause', expectedVersion: 2 },
    ]) {
      const result = await post(api, `/api/islands/${id}/commands`, owner, { ...command, commandId: crypto.randomUUID() });
      if (result.status() !== 200) throw new Error('Could not cue the official iframe sample.');
    }
    for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]] as const) {
      const browser = await engine.launch();
      const failedResources: { host: string; error: string | null }[] = [];
      try {
        const page = await browser.newPage();
        page.on('requestfailed', (request) => {
          const host = new URL(request.url()).hostname;
          if (host.endsWith('youtube.com') || host.endsWith('googlevideo.com')) failedResources.push({ host, error: request.failure()?.errorText || null });
        });
        await login(page, owner);
        await page.goto(`http://127.0.0.1:3100/island/${id}`);
        await expect(page.getByRole('heading', { name: 'Real iframe smoke — synthetic room' })).toBeVisible();
        await expect(page.getByTestId('test-player')).toHaveCount(0);
        let ready = false;
        try {
          await expect(page.getByRole('button', { name: '播放', exact: true })).toBeEnabled({ timeout: 22000 });
          ready = true;
        } catch { /* Record missing external readiness without misclassifying it as a pass. */ }
        const alerts = await page.getByRole('alert').allTextContents();
        await mkdir('.impeccable/review', { recursive: true });
        await page.screenshot({ path: `.impeccable/review/youtube-smoke-${name}.png`, fullPage: true });
        records.push({ engine: name, realIframeReady: ready, alerts, failedResources, scope: 'External iframe/API readiness only; no audible playback or drift certification.' });
      } finally { await browser.close(); }
    }
  } finally {
    await db.recursiveDelete(db.doc(`islands/${id}`));
    await db.doc(`islandSecrets/${id}`).delete();
  }
} finally { await api.dispose(); }
await mkdir('docs/measurements', { recursive: true });
await writeFile('docs/measurements/youtube-smoke.json', JSON.stringify(records, null, 2) + '\n');
console.log(JSON.stringify(records, null, 2));
if (records.some((record) => !record.realIframeReady)) process.exitCode = 1;
