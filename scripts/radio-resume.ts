// Real Chromium host / WebKit listener transport regression. Demo emulator rooms only.
import { chromium, webkit, expect, request as playwrightRequest } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { adminDb, identity, login, post, localOrigin } from '../tests/e2e/helpers';
import { observePlayerCommands, sample, waitForPlayback } from './youtube-timeline';
import { parseRoom, record } from '../lib/validation';
const output = process.env.MELODY_RESUME_OUTPUT || '/tmp/melody-resume-real.json';
if (!output.startsWith('/tmp/')) throw Error('Evidence must initially stay in /tmp');
const db = adminDb();
const api = await playwrightRequest.newContext();
const owner = await identity(api); const guest = await identity(api);
const create = await post(api, '/api/islands', owner, { islandName: 'Real transport acknowledgement', islandPassword: 'resume-fixture-123' });
const body = record(await create.json());
if (!create.ok() || typeof body.id !== 'string') throw Error('Invalid demo room');
const id = body.id; const ref = db.doc(`islands/${id}`);
const browsers = await Promise.all([chromium.launch(), webkit.launch()]);
const pages = await Promise.all(browsers.map(browser => browser.newPage()));
const cycles: Record<string, unknown>[] = []; let failure: string | undefined; let stage = 'setup';
try {
  expect((await post(api, `/api/islands/${id}/join`, guest, { islandPassword: 'resume-fixture-123' })).ok()).toBe(true);
  expect((await post(api, `/api/islands/${id}/commands`, owner, { type: 'add', song: { videoId: 'aqz-KE-bpKQ', title: 'Big Buck Bunny' }, commandId: crypto.randomUUID() })).ok()).toBe(true);
  for (const [i, page] of pages.entries()) {
    await observePlayerCommands(page); await login(page, i === 0 ? owner : guest);
    await page.goto(`${localOrigin()}/island/${id}?syncDebug=1`);
    await expect(page.locator('.video-frame')).toHaveAttribute('aria-busy', 'false', { timeout: 30000 });
  }
  await pages[0].getByRole('button', { name: '播放', exact: true }).click();
  // Initial local audio gestures are allowed. Subsequent resumes never click a
  // listening prompt: that would conceal the reported transport regression.
  await Promise.all(pages.map(waitForPlayback));
  for (let i = 0; i < 6; i++) {
    stage = `cycle-${i + 1}-${i < 3 ? 'settled' : 'rapid'}`;
    const before = parseRoom((await ref.get()).data());
    expect((await post(api, `/api/islands/${id}/commands`, owner, { type: 'pause', expectedPlaybackRevision: before.playbackRevision, commandId: crypto.randomUUID() })).ok()).toBe(true);
    if (i < 3) await expect.poll(async () => (await Promise.all(pages.map(sample))).every(point => point.paused), { timeout: 12000 }).toBe(true);
    const paused = parseRoom((await ref.get()).data());
    expect((await post(api, `/api/islands/${id}/commands`, owner, { type: 'play', expectedPlaybackRevision: paused.playbackRevision, commandId: crypto.randomUUID() })).ok()).toBe(true);
    const started = Date.now();
    await expect.poll(async () => (await Promise.all(pages.map(sample))).every(point => !point.paused && point.readyState >= 2 && point.seconds * 1000 > paused.positionMs + 250), { timeout: 15000 }).toBe(true);
    const after = parseRoom((await ref.get()).data());
    expect(after.playbackRevision).toBe((before.playbackRevision ?? 0) + 2);
    expect(after.trackEpoch).toBe(before.trackEpoch);
    const observations = await Promise.all(pages.map(sample));
    cycles.push({ cycle: i + 1, kind: i < 3 ? 'settled' : 'rapid', resumeObservedMs: Date.now() - started, observations });
    await new Promise<void>(resolve => setTimeout(resolve, 1500));
  }
} catch (error) { failure = error instanceof Error ? error.message.split('\n')[0] : String(error); process.exitCode = 1; }
finally {
  const media = await Promise.all(pages.map(page => sample(page).catch(() => null)));
  const diagnostics = await Promise.all(pages.map(page => page.evaluate(() => window.__melodySyncDiagnostics).catch(() => null)));
  const canonical = parseRoom((await ref.get()).data());
  await writeFile(output, JSON.stringify({ passed: !failure, stage, failure, cycles, media, diagnostics,
    canonical: { isPlaying: canonical.isPlaying, positionMs: canonical.positionMs, playbackRevision: canonical.playbackRevision, trackEpoch: canonical.trackEpoch },
    scope: 'Real YouTube Chromium host and WebKit listener on one Mac, emulator-only room and explicit duration fixture. Not physical iPhone or acoustic latency.' }, null, 2) + '\n');
  console.log(JSON.stringify({ output, passed: !failure, stage, cycles: cycles.length, failure }));
  await Promise.all(browsers.map(browser => browser.close())); await api.dispose();
  await db.recursiveDelete(ref); await db.doc(`islandSecrets/${id}`).delete();
}
