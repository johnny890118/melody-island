// Opt-in network smoke check: uses the real iframe API with demo room data.
// It does not establish audible playback, inter-device drift, or Safari/iPhone compatibility.
import { chromium, webkit, request as playwrightRequest, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { adminDb, identity, login, post } from '../tests/e2e/helpers';
import { measureTimeline, sample, waitForPlayback } from './youtube-timeline';
const timeline = process.env.MELODY_REAL_TIMELINE === 'true';
const transition = timeline && process.env.MELODY_REAL_TRANSITION === 'true';
const sampleId = 'M7lc1UVf-VE';
const nextId = 'aqz-KE-bpKQ';
const nextTitle = 'Big Buck Bunny — transition fixture';
const api = await playwrightRequest.newContext();
const records = [];
try {
  // adminDb rejects non-local emulator endpoints before any identity/room is created.
  const db = adminDb();
  const owner = await identity(api);
  const guest = timeline ? await identity(api) : null;
  const response = await post(api, '/api/islands', owner, {
    islandName: 'Real iframe smoke — synthetic room',
    islandPassword: 'synthetic-only-123',
  });
  if (response.status() !== 201) throw new Error('Demo preview did not create the synthetic room.');
  const payload: unknown = await response.json();
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('id' in payload) ||
    typeof payload.id !== 'string'
  )
    throw new Error('Invalid room response');
  const id = payload.id;
  try {
    if (guest) {
      const joined = await post(api, `/api/islands/${id}/join`, guest, {
        islandPassword: 'synthetic-only-123',
      });
      if (joined.status() !== 200) throw new Error('Demo guest could not join.');
    }
    const added = await post(api, `/api/islands/${id}/commands`, owner, {
      type: 'add',
      song: { videoId: sampleId, title: 'YouTube IFrame API official sample' },
      commandId: crypto.randomUUID(),
    });
    if (added.status() !== 200) throw new Error('Could not seed the official iframe sample.');
    for (const command of [
      { type: 'select', videoId: sampleId, expectedVersion: 1 },
      { type: 'pause', expectedVersion: 2 },
    ]) {
      const result = await post(api, `/api/islands/${id}/commands`, owner, {
        ...command,
        commandId: crypto.randomUUID(),
      });
      if (result.status() !== 200) throw new Error('Could not cue the official iframe sample.');
    }
    if (transition) {
      const next = await post(api, `/api/islands/${id}/commands`, owner, {
        type: 'add',
        song: { videoId: nextId, title: nextTitle },
        commandId: crypto.randomUUID(),
      });
      if (!next.ok()) throw new Error('Could not add the transition fixture.');
    }
    for (const [name, engine] of [
      ['chromium', chromium],
      ['webkit', webkit],
    ] as const) {
      if (transition) {
        const roomRef = db.doc(`islands/${id}`);
        const room = (await roomRef.get()).data();
        if (!room || typeof room.version !== 'number') throw new Error('Missing fixture version.');
        const reset = await post(api, `/api/islands/${id}/commands`, owner, {
          type: 'select',
          videoId: sampleId,
          expectedVersion: room.version,
          commandId: crypto.randomUUID(),
        });
        if (!reset.ok()) throw new Error('Could not reset fixture for the next engine.');
        const paused = await post(api, `/api/islands/${id}/commands`, owner, {
          type: 'pause',
          expectedVersion: room.version + 1,
          commandId: crypto.randomUUID(),
        });
        if (!paused.ok()) throw new Error('Could not pause the reset fixture.');
      }
      const browser = await engine.launch();
      const pageErrors: string[] = [];
      const failedResources: { host: string; error: string | null }[] = [];
      try {
        const page = await browser.newPage();
        page.on('pageerror', (error) => pageErrors.push(error.message.split('\n')[0]));
        page.on('requestfailed', (request) => {
          const host = new URL(request.url()).hostname;
          if (host.endsWith('youtube.com') || host.endsWith('googlevideo.com'))
            failedResources.push({ host, error: request.failure()?.errorText || null });
        });
        await login(page, owner);
        await page.goto(`http://127.0.0.1:3100/island/${id}`);
        await expect(
          page.getByRole('heading', { name: 'Real iframe smoke — synthetic room' }),
        ).toBeVisible();
        await expect(page.getByTestId('test-player')).toHaveCount(0);
        let ready = false;
        try {
          await expect(page.getByRole('button', { name: '播放', exact: true })).toBeEnabled({
            timeout: 22000,
          });
          ready = true;
        } catch {
          /* Record missing external readiness without misclassifying it as a pass. */
        }
        let timelineResult: {
          samples?: Awaited<ReturnType<typeof measureTimeline>>;
          error?: string;
          autoAdvance?: {
            duration: number;
            positionMs: number;
            nextVideo: string;
            versionDelta: number;
          };
        } | null = null;
        if (guest) {
          try {
            if (!ready) throw new Error('Owner iframe did not become ready.');
            const guestPage = await browser.newPage();
            await login(guestPage, guest);
            await guestPage.goto(`http://127.0.0.1:3100/island/${id}`);
            await expect(
              guestPage.getByRole('heading', { name: 'Real iframe smoke — synthetic room' }),
            ).toBeVisible();
            timelineResult = { samples: await measureTimeline(page, guestPage) };
            if (transition) {
              const { duration } = await sample(page);
              if (!Number.isFinite(duration) || duration < 15)
                throw new Error('Invalid fixture duration.');
              const roomRef = db.doc(`islands/${id}`);
              const snapshot = await roomRef.get();
              const before = snapshot.data();
              if (
                !before ||
                before.isPlaying ||
                before.currentVideo !== sampleId ||
                typeof before.version !== 'number' ||
                !snapshot.updateTime
              )
                throw new Error('Unexpected fixture state before the ending test.');
              // Demo-only setup skips the wait for a whole video. Play and advance still use normal commands.
              const positionMs = Math.floor((duration - 9) * 1000);
              await roomRef.update({ positionMs }, { lastUpdateTime: snapshot.updateTime });
              await expect
                .poll(async () => (await sample(page)).seconds, { timeout: 12000 })
                .toBeGreaterThan(positionMs / 1000 - 1);
              await page.getByRole('button', { name: '播放', exact: true }).click();
              await Promise.all(
                [page, guestPage].map((client) =>
                  expect(client.getByRole('heading', { name: nextTitle })).toBeVisible({
                    timeout: 30000,
                  }),
                ),
              );
              await Promise.all([waitForPlayback(page), waitForPlayback(guestPage)]);
              const after = (await roomRef.get()).data();
              const versionDelta =
                typeof after?.version === 'number' ? after.version - before.version : -1;
              if (after?.currentVideo !== nextId || versionDelta !== 2)
                throw new Error('Expected exactly one play and one automatic advance.');
              timelineResult.autoAdvance = {
                duration,
                positionMs,
                nextVideo: nextId,
                versionDelta,
              };
            }
          } catch (error) {
            // Keep provider failures and incomplete timelines separate from measured drift.
            timelineResult = {
              ...timelineResult,
              error: (error instanceof Error ? error.message : String(error)).split('\n')[0],
            };
          } finally {
            const room = (await db.doc(`islands/${id}`).get()).data();
            if (room?.isPlaying === true && typeof room.version === 'number') {
              const paused = await post(api, `/api/islands/${id}/commands`, owner, {
                type: 'pause',
                expectedVersion: room.version,
                commandId: crypto.randomUUID(),
              });
              if (!paused.ok()) throw new Error('Could not reset demo playback between engines.');
            }
          }
        }
        const alerts = await page.getByRole('alert').allTextContents();
        await mkdir('.impeccable/review', { recursive: true });
        await page.screenshot({
          path: `.impeccable/review/youtube-smoke-${name}.png`,
          fullPage: true,
        });
        records.push({
          engine: name,
          realIframeReady: ready,
          timeline: timelineResult,
          alerts,
          pageErrors,
          failedResources,
          scope: timeline
            ? 'Real YouTube HTML media clocks in two isolated contexts on one host. No acoustic or cross-device measurement.'
            : 'External iframe/API readiness only. No playback timeline measurement.',
        });
      } finally {
        await browser.close();
      }
    }
  } finally {
    await db.recursiveDelete(db.doc(`islands/${id}`));
    await db.doc(`islandSecrets/${id}`).delete();
  }
} finally {
  await api.dispose();
}
await mkdir('docs/measurements', { recursive: true });
await writeFile(
  transition
    ? 'docs/measurements/youtube-transition.json'
    : timeline
      ? 'docs/measurements/youtube-timeline.json'
      : 'docs/measurements/youtube-smoke.json',
  JSON.stringify(records, null, 2) + '\n',
);
console.log(JSON.stringify(records, null, 2));
if (
  records.some(
    (record) =>
      !record.realIframeReady ||
      (timeline && !record.timeline?.samples) ||
      (transition && !record.timeline?.autoAdvance),
  )
)
  process.exitCode = 1;
