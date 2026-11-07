// Real iframe reconnect/late-join probe. All room mutations target demo emulators.
import { chromium, webkit, request as playwrightRequest, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { adminDb, identity, login, post, localOrigin } from '../tests/e2e/helpers';
import { observePlayerCommands, sample, waitForPlayback, measureRecovery } from './youtube-timeline';
const api = await playwrightRequest.newContext();
const engine = process.env.MELODY_REAL_ENGINE || 'chromium';
if (!['chromium', 'webkit'].includes(engine)) throw Error('Unsupported engine');
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const db = adminDb();
const owner = await identity(api);
const guest = await identity(api);
const result = await post(api, '/api/islands', owner, { islandName: 'Real reconnect fixture', islandPassword: 'radio-reconnect-123' });
const body: unknown = await result.json();
if (!result.ok() || !body || typeof body !== 'object' || !('id' in body) || typeof body.id !== 'string') throw Error('Invalid demo room');
const id = body.id;
const ref = db.doc(`islands/${id}`);
const evidence: Record<string, unknown> = { engine, scope: 'Real YouTube in independent browser contexts on one Mac; no physical-device/acoustic measurement. Emulator metadata fixture.' };
try {
  expect((await post(api, `/api/islands/${id}/join`, guest, { islandPassword: 'radio-reconnect-123' })).ok()).toBe(true);
  expect((await post(api, `/api/islands/${id}/commands`, owner, { type: 'add', song: { videoId: 'aqz-KE-bpKQ', title: 'Big Buck Bunny' }, commandId: crypto.randomUUID() })).ok()).toBe(true);
  const first = await browser.newPage(); await observePlayerCommands(first); await login(first, owner);
  await first.goto(`${localOrigin()}/island/${id}?syncDebug=1`);
  await expect(first.locator('.video-frame')).toHaveAttribute('aria-busy', 'false', { timeout: 30000 });
  await first.getByRole('button', { name: '播放', exact: true }).click(); await waitForPlayback(first);
  await new Promise<void>(resolve => setTimeout(resolve, 12000));
  const second = await browser.newPage(); await observePlayerCommands(second); await login(second, guest);
  await second.goto(`${localOrigin()}/island/${id}?syncDebug=1`); await waitForPlayback(second);
  evidence.lateJoin = await measureRecovery(first, second, Date.now());
  const before = (await ref.get()).data();
  await second.context().setOffline(true);
  await new Promise<void>(resolve => setTimeout(resolve, 10000));
  const offline = (await ref.get()).data();
  expect(offline?.playbackRevision).toBe(before?.playbackRevision);
  expect(offline?.playbackUpdatedAt).toBe(before?.playbackUpdatedAt);
  await second.context().setOffline(false);
  await waitForPlayback(second);
  evidence.reconnect = await measureRecovery(first, second, Date.now());
  await second.reload(); await waitForPlayback(second);
  evidence.refresh = await measureRecovery(first, second, Date.now());
  const after = (await ref.get()).data();
  expect(after?.playbackRevision).toBe(before?.playbackRevision);
  expect(after?.playbackUpdatedAt).toBe(before?.playbackUpdatedAt);
  evidence.canonicalRevision = after?.playbackRevision;
  evidence.final = await Promise.all([sample(first), sample(second)]);
  evidence.diagnostics = await Promise.all([first, second].map(page => page.evaluate(() => window.__melodySyncDiagnostics)));
  evidence.passed = true;
} catch (error) {
  evidence.passed = false; evidence.failure = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  await writeFile(`/tmp/melody-radio-reconnect-${engine}.json`, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ passed: evidence.passed, failure: evidence.failure }));
  await browser.close(); await api.dispose(); await db.recursiveDelete(ref); await db.doc(`islandSecrets/${id}`).delete();
}
