// Real YouTube media observations, isolated demo rooms only. Never acoustic/device-latency evidence.
import { chromium, request as playwrightRequest, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { adminDb, identity, login, post, localOrigin } from '../tests/e2e/helpers';
import { observePlayerCommands, sample, waitForPlayback } from './youtube-timeline';
const seconds = Number(process.env.MELODY_ENDURANCE_SECONDS || 360);
if (!Number.isFinite(seconds) || seconds < 30 || seconds > 3600) throw Error('Invalid duration');
const output = process.env.MELODY_ENDURANCE_OUTPUT || '/tmp/melody-radio-endurance.json';
const videoId = process.env.MELODY_ENDURANCE_VIDEO_ID || 'M7lc1UVf-VE';
if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw Error('Invalid fixture video');
if (!output.startsWith('/tmp/')) throw Error('Evidence must initially stay in /tmp');
const api = await playwrightRequest.newContext();
const browser = await chromium.launch();
const db = adminDb();
const owner = await identity(api);
const create = await post(api, '/api/islands', owner, { islandName: 'Radio endurance fixture', islandPassword: 'synthetic-radio-123' });
if (!create.ok()) throw Error('Demo room creation failed');
const payload: unknown = await create.json();
if (!payload || typeof payload !== 'object' || !('id' in payload) || typeof payload.id !== 'string') throw Error('Invalid room');
const id = payload.id;
const ref = db.doc(`islands/${id}`);
const points: Record<string, unknown>[] = [];
let failure: string | undefined;
let naturalCompletion: Record<string, unknown> | undefined;
let providerFailure: Record<string, unknown> | undefined;
try {
  const add = await post(api, `/api/islands/${id}/commands`, owner, { type: 'add', song: { videoId, title: 'Public video endurance fixture' }, commandId: crypto.randomUUID() });
  if (!add.ok()) throw Error('Fixture admission failed');
  const page = await browser.newPage();
  await observePlayerCommands(page);
  await login(page, owner);
  await page.goto(`${localOrigin()}/island/${id}?syncDebug=1`);
  await expect(page.getByRole('heading', { name: 'Radio endurance fixture' })).toBeVisible();
  if (await page.locator('.video-frame').getAttribute('aria-busy') !== null)
    await expect(page.locator('.video-frame')).toHaveAttribute('aria-busy', 'false', { timeout: 30000 });
  await page.getByRole('button', { name: '播放', exact: true }).click({ timeout: 30000 });
  await waitForPlayback(page);
  const start = Date.now();
  for (let tick = 0; Date.now() - start < seconds * 1000; tick++) {
    const media = await sample(page);
    const canonical = (await ref.get()).data();
    points.push({ elapsedMs: Date.now() - start, ...media, room: { version: canonical?.version, playbackRevision: canonical?.playbackRevision, trackEpoch: canonical?.trackEpoch, isPlaying: canonical?.isPlaying, positionMs: canonical?.positionMs, playbackUpdatedAt: canonical?.playbackUpdatedAt } });
    if (media.readyState === 0 && tick > 3) {
      providerFailure = { media, alerts: await page.getByRole('alert').allTextContents(),
        iframeText: (await page.frameLocator('.video-frame iframe').locator('body').innerText()).slice(0, 600) };
      await page.screenshot({ path: '/tmp/melody-radio-provider-failure.png' });
      throw Error('Provider media became unavailable after starting');
    }
    if (tick % 30 === 0) console.log(JSON.stringify({ phase: 'endurance', elapsedSeconds: Math.round((Date.now() - start) / 1000), mediaSeconds: media.seconds, commands: media.commands }));
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
  }
  // Explicitly accelerated demo fixture; the iframe's actual ENDED event is still observed.
  const duration = (await sample(page)).duration;
  const before = (await ref.get()).data();
  if (!Number.isFinite(duration) || duration < 30 || !before) throw Error('Missing content duration');
  const nearEnd = Math.round((duration - 7) * 1000);
  if (process.env.MELODY_ENDURANCE_NATURAL === 'true') {
    const remaining = Math.max(0, duration - (await sample(page)).seconds);
    const stopAt = Date.now() + (remaining + 4) * 1000;
    let previous = (await sample(page)).seconds;
    while (Date.now() < stopAt) {
      await new Promise<void>(resolve => setTimeout(resolve, 2000));
      const media = await sample(page);
      const canonical = (await ref.get()).data();
      points.push({ elapsedMs: Date.now() - start, ...media, room: { version: canonical?.version, playbackRevision: canonical?.playbackRevision, trackEpoch: canonical?.trackEpoch, isPlaying: canonical?.isPlaying, positionMs: canonical?.positionMs, playbackUpdatedAt: canonical?.playbackUpdatedAt } });
      if (media.readyState === 0) throw Error('Provider unavailable before natural completion');
      if (canonical?.isPlaying === false || media.seconds < previous - 1) break;
      previous = media.seconds;
    }
    const after = (await ref.get()).data();
    naturalCompletion = { setup: 'Whole content from initial start; no accelerated anchor', duration, media: await sample(page), canonical: { isPlaying: after?.isPlaying, positionMs: after?.positionMs, version: after?.version, trackEpoch: after?.trackEpoch } };
  } else {
  await ref.update({ positionMs: nearEnd, playbackUpdatedAt: Date.now(),
    ...(typeof before.playbackRevision === 'number' ? { playbackRevision: before.playbackRevision + 1 } : {}),
    ...(typeof before.trackEpoch === 'number' ? { trackEpoch: before.trackEpoch + 1 } : {}),
    version: before.version + 1 });
  await new Promise<void>(resolve => setTimeout(resolve, 16000));
  const after = (await ref.get()).data();
  naturalCompletion = { setup: 'Demo-only accelerated anchor, not whole-duration playback', duration, media: await sample(page), canonical: { isPlaying: after?.isPlaying, positionMs: after?.positionMs, version: after?.version, trackEpoch: after?.trackEpoch } };
  }
} catch (error) {
  failure = error instanceof Error ? error.message.split('\n')[0] : String(error);
} finally {
  await mkdir('/tmp', { recursive: true });
  const mediaPoints = points.filter((p): p is typeof p & { seconds: number } => typeof p.seconds === 'number');
  const backwards = mediaPoints.slice(1).filter((p, i) => p.seconds < mediaPoints[i].seconds - 0.75).length;
  await writeFile(output, JSON.stringify({ videoId, requestedSeconds: seconds, actualObservationMs: points.at(-1)?.elapsedMs, points, backwardJumps: backwards, naturalCompletion, providerFailure, failure, scope: 'Real YouTube media clocks on one Mac. No acoustic or physical cross-device measurement.' }, null, 2) + '\n');
  console.log(JSON.stringify({ output, samples: points.length, backwards, failure: failure || null, naturalCompletion }));
  await browser.close();
  await api.dispose();
  await db.recursiveDelete(ref);
  await db.doc(`islandSecrets/${id}`).delete();
}
if (failure) process.exitCode = 1;
