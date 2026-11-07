// Opt-in network smoke check: uses the real iframe API with demo room data.
// It does not establish audible playback, inter-device drift, or Safari/iPhone compatibility.
import { chromium, webkit, request as playwrightRequest, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { adminDb, identity, login, post, localOrigin } from '../tests/e2e/helpers';
import { measureTimeline, sample, waitForPlayback, observePlayerCommands, measureRecovery } from './youtube-timeline';
const timeline = process.env.MELODY_REAL_TIMELINE === 'true';
const transition = timeline && process.env.MELODY_REAL_TRANSITION === 'true';
const manualSwitch = process.env.MELODY_SYNC_MANUAL_SWITCH === 'true';
const bufferProbe = transition && process.env.MELODY_REAL_BUFFER === 'true';
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
      // Restrict manual guest skip; a v3 guest can still relay a server-verified expiry.
      const permissions = await post(api, `/api/islands/${id}/commands`, owner, {
        type: 'permissions',
        permission: 'guestsCanSkip', enabled: false,
        commandId: crypto.randomUUID(),
      });
      if (!permissions.ok()) throw new Error('Could not configure owner-only manual skip.');
    }
    for (const [name, engine] of [
      ['chromium', chromium],
      ['webkit', webkit],
    ] as const) {
      if (process.env.MELODY_REAL_ENGINE && process.env.MELODY_REAL_ENGINE !== name) continue;
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
        await observePlayerCommands(page);
        page.on('pageerror', (error) => pageErrors.push(error.message.split('\n')[0]));
        page.on('requestfailed', (request) => {
          const host = new URL(request.url()).hostname;
          if (host.endsWith('youtube.com') || host.endsWith('googlevideo.com'))
            failedResources.push({ host, error: request.failure()?.errorText || null });
        });
        await login(page, owner);
        await page.goto(`${localOrigin()}/island/${id}?syncDebug=1`);
        await expect(
          page.getByRole('heading', { name: 'Real iframe smoke — synthetic room' }),
        ).toBeVisible();
        await expect(page.getByTestId('test-player')).toHaveCount(0);
        let ready = false;
        try {
          if (await page.locator('.video-frame').getAttribute('aria-busy') !== null)
            await expect(page.locator('.video-frame')).toHaveAttribute('aria-busy', 'false', { timeout: 22000 });
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
          stage?: string;
          autoAdvance?: {
            duration: number;
            positionMs?: number;
            mediaHold?: {
              delayedRequests: number;
              readyStateDuringHold: number | null;
              holdMs: number;
              recoveryMs: number;
              ownerSeekCommands: number;
              guestSeekCommands: number;
              ownerPlayCommands: number;
              guestPlayCommands: number;
              recoveredTimelineDifferenceMs: number;
              recoverySamples: Awaited<ReturnType<typeof measureRecovery>>;
              convergenceMs: number | null;
            };
            nextVideo: string;
            versionDelta: number;
            transitionKind: 'next-command' | 'natural-ended';
          };
        } | null = null;
        if (guest) {
          let stage = 'iframe readiness';
          try {
            if (!ready) throw new Error('Owner iframe did not become ready.');
            const guestPage = await browser.newPage();
            await observePlayerCommands(guestPage);
            await login(guestPage, guest);
            await guestPage.goto(`${localOrigin()}/island/${id}?syncDebug=1`);
            await expect(
              guestPage.getByRole('heading', { name: 'Real iframe smoke — synthetic room' }),
            ).toBeVisible();
            stage = 'both clients play and pause';
            timelineResult = { samples: await measureTimeline(page, guestPage) };
            if (transition) {
              const { duration } = await sample(page);
              if (!Number.isFinite(duration) || duration < 15)
                throw new Error('Invalid fixture duration.');
              const roomRef = db.doc(`islands/${id}`);
              // Protocol-v2 baseline needs a lease; v3 uses server deadlines.
              if (typeof (await roomRef.get()).data()?.playbackRevision !== 'number') {
                stage = 'legacy host leadership';
                await expect.poll(async () => (await roomRef.get()).data()?.leaderUid === owner.localId,
                  { timeout: 15000 }).toBe(true);
              }
              stage = 'near-end fixture';
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
              if (!manualSwitch) {
                await roomRef.update({ positionMs,
                  ...(typeof before.playbackRevision === 'number' ? { playbackRevision: before.playbackRevision + 1 } : {}),
                  ...(typeof before.trackEpoch === 'number' ? { trackEpoch: before.trackEpoch + 1 } : {}),
                }, { lastUpdateTime: snapshot.updateTime });
                await expect
                  .poll(async () => (await sample(page)).seconds, { timeout: 12000 })
                  .toBeGreaterThan(positionMs / 1000 - 1);
              }
              const [ownerBefore, guestBefore] = await Promise.all([sample(page), sample(guestPage)]);
              let delayedRequests = 0;
              let readyStateDuringHold: number | null = null;
              let releasedAt = 0;
              let releaseMedia = () => {};
              const mediaGate = new Promise<void>((resolve) => {
                releaseMedia = resolve;
              });
              if (bufferProbe) {
                await guestPage.route(
                  /^https:\/\/[^/]+\.googlevideo\.com\/videoplayback/,
                  async (route) => {
                    delayedRequests++;
                    await mediaGate;
                    await route.continue();
                  },
                );
              }
              try {
                stage = 'natural advance';
                await page.getByRole('button', { name: manualSwitch ? '下一首' : '播放', exact: true }).click();
                await Promise.all(
                  [page, guestPage].map((client) =>
                    expect(client.getByRole('heading', { name: nextTitle })).toBeVisible({
                      timeout: 30000,
                    }),
                  ),
                ).catch(async (error: unknown) => {
                  const canonical = (await roomRef.get()).data();
                  console.log(JSON.stringify({
                    engine: name,
                    naturalAdvanceFailure: {
                      owner: await sample(page).catch(() => null),
                      guest: await sample(guestPage).catch(() => null),
                      canonical: {
                        video: canonical?.currentVideo,
                        playing: canonical?.isPlaying,
                        positionMs: canonical?.positionMs,
                        version: canonical?.version,
                      },
                    },
                  }));
                  throw error;
                });
                if (bufferProbe) {
                  stage = 'media hold';
                  await expect.poll(() => delayedRequests, { timeout: 8000 }).toBeGreaterThan(0);
                  readyStateDuringHold =
                    (await sample(guestPage).catch(() => null))?.readyState ?? null;
                  await guestPage.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 10000)));
                }
              } finally {
                releasedAt = Date.now();
                releaseMedia();
              }
              stage = 'next track playback';
              await Promise.all([waitForPlayback(page), waitForPlayback(guestPage)]);
              const recoveryMs = Date.now() - releasedAt;
              const recoverySamples = await measureRecovery(page, guestPage, releasedAt);
              const [ownerAfter, guestAfter] = await Promise.all([sample(page), sample(guestPage)]);
              const after = (await roomRef.get()).data();
              const versionDelta =
                typeof after?.version === 'number' ? after.version - before.version : -1;
              if (after?.currentVideo !== nextId || versionDelta !== (manualSwitch ? 1 : 2))
                throw new Error('Unexpected shared playback writes during the measured transition.');
              timelineResult.autoAdvance = {
                duration,
                ...(!manualSwitch ? { positionMs } : {}),
                nextVideo: nextId,
                versionDelta,
                transitionKind: manualSwitch ? 'next-command' : 'natural-ended',
                ...(bufferProbe ? { mediaHold: {
                  delayedRequests, readyStateDuringHold, holdMs: 10000, recoveryMs,
                  recoverySamples,
                  convergenceMs: recoverySamples.find(point =>
                    point.bothPlaying && point.timelineDifferenceMs <= 1500,
                  )?.afterReleaseMs ?? null,
                  ownerSeekCommands: (ownerAfter.commands.seekTo || 0) - (ownerBefore.commands.seekTo || 0),
                  guestSeekCommands: (guestAfter.commands.seekTo || 0) - (guestBefore.commands.seekTo || 0),
                  ownerPlayCommands: (ownerAfter.commands.playVideo || 0) - (ownerBefore.commands.playVideo || 0),
                  guestPlayCommands: (guestAfter.commands.playVideo || 0) - (guestBefore.commands.playVideo || 0),
                  recoveredTimelineDifferenceMs: Math.round(Math.abs(
                    (guestAfter.seconds - ownerAfter.seconds) * 1000 -
                    (guestAfter.observedAtMs - ownerAfter.observedAtMs),
                  )),
                } } : {}),
              };
            }
          } catch (error) {
            // Keep provider failures and incomplete timelines separate from measured drift.
            timelineResult = {
              ...timelineResult,
              stage,
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
  bufferProbe
    ? 'docs/measurements/youtube-media-hold.json'
    : transition
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
