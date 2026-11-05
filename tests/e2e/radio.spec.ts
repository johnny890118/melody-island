import { expect, test, type APIRequestContext } from '@playwright/test';
import { adminDb, identity, post } from './helpers';
import { parseRoom, record } from '../../lib/validation';
import { DEFAULT_PERMISSIONS } from '../../lib/session';
import type { Room } from '../../lib/types';
const ids = ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'];
const proof = (room: Room) => ({ expectedPlaybackRevision: room.playbackRevision ?? 0, trackEpoch: room.trackEpoch ?? 0, videoId: room.currentVideo });
async function setup(request: APIRequestContext, count = 2) {
  const owner = await identity(request);
  const result = await post(request, '/api/islands', owner, { islandName: 'Radio protocol fixture', islandPassword: 'radio-fixture-123' });
  expect(result.status()).toBe(201);
  const body = record(await result.json()); if (typeof body.id !== 'string') throw Error('Invalid fixture room');
  const id = body.id;
  const ref = adminDb().doc(`islands/${id}`);
  for (const videoId of ids.slice(0, count))
    expect((await post(request, `/api/islands/${id}/commands`, owner, { type: 'add', song: { videoId, title: videoId, durationMs: 1 }, commandId: crypto.randomUUID() })).status()).toBe(200);
  const before = parseRoom((await ref.get()).data());
  expect(before.playlist.every(song => song.durationMs === 60000)).toBe(true);
  expect((await post(request, `/api/islands/${id}/commands`, owner, { type: 'play', expectedPlaybackRevision: 0, commandId: crypto.randomUUID() })).status()).toBe(200);
  return { owner, id, ref, room: async () => parseRoom((await ref.get()).data()) };
}
test('repeated play intents and queue edits never create a replacement timeline', async ({ request }) => {
  const fixture = await setup(request);
  const initial = await fixture.room();
  const replies = await Promise.all(Array.from({ length: 20 }, () => post(request, `/api/islands/${fixture.id}/commands`, fixture.owner, {
    type: 'play', expectedPlaybackRevision: initial.playbackRevision, commandId: crypto.randomUUID(),
  })));
  expect(replies.map(reply => reply.status())).toEqual(Array(20).fill(200));
  const unchanged = await fixture.room();
  expect([unchanged.positionMs, unchanged.playbackUpdatedAt, unchanged.playbackRevision, unchanged.trackEpoch, unchanged.version])
    .toEqual([initial.positionMs, initial.playbackUpdatedAt, initial.playbackRevision, initial.trackEpoch, initial.version]);
  expect((await post(request, `/api/islands/${fixture.id}/commands`, fixture.owner, { type: 'add', song: { videoId: ids[2], title: 'C' }, commandId: crypto.randomUUID() })).status()).toBe(200);
  expect((await post(request, `/api/islands/${fixture.id}/commands`, fixture.owner, {
    type: 'pause', expectedVersion: initial.version, expectedPlaybackRevision: initial.playbackRevision, commandId: crypto.randomUUID(),
  })).status()).toBe(200);
  expect((await fixture.room()).isPlaying).toBe(false);
});
test('20 concurrent deadline relays advance exactly once, retaining the scheduled anchor', async ({ request }) => {
  test.setTimeout(120000);
  const fixture = await setup(request);
  const members = [fixture.owner];
  for (let i = 1; i < 20; i++) members.push(await identity(request));
  const joins = await Promise.all(members.slice(1).map(member => post(request, `/api/islands/${fixture.id}/join`, member, { islandPassword: 'radio-fixture-123' })));
  expect(joins.map(response => response.status())).toEqual(Array(19).fill(200));
  const initial = await fixture.room();
  const anchor = Date.now() - 2000;
  await fixture.ref.update({ positionMs: 59000, playbackUpdatedAt: anchor, playbackRevision: (initial.playbackRevision ?? 0) + 1 });
  const expired = await fixture.room();
  const results = await Promise.all(members.map(member => post(request, `/api/islands/${fixture.id}/commands`, member, { type: 'advance', ...proof(expired), commandId: crypto.randomUUID() })));
  expect(results.filter(result => result.status() === 200)).toHaveLength(1);
  expect(results.filter(result => result.status() === 409)).toHaveLength(19);
  expect(await fixture.room()).toMatchObject({ currentVideo: ids[1], playbackUpdatedAt: anchor + 1000,
    trackEpoch: (expired.trackEpoch ?? 0) + 1, playbackRevision: (expired.playbackRevision ?? 0) + 1, version: expired.version + 1 });
});
test('manual permissions survive owner handover while automatic deadlines do not depend on its lease', async ({ request }) => {
  const fixture = await setup(request);
  const guest = await identity(request);
  expect((await post(request, `/api/islands/${fixture.id}/join`, guest, { islandPassword: 'radio-fixture-123' })).status()).toBe(200);
  expect((await post(request, `/api/islands/${fixture.id}/commands`, fixture.owner, { type: 'permissions', permissions: {
    ...DEFAULT_PERMISSIONS, guestsCanSkip: false, guestsCanControlPlayback: false,
  }, commandId: crypto.randomUUID() })).status()).toBe(200);
  const state = await fixture.room();
  expect((await post(request, `/api/islands/${fixture.id}/commands`, guest, { type: 'advance', ...proof(state), commandId: crypto.randomUUID() })).status()).toBe(409);
  expect((await post(request, `/api/islands/${fixture.id}/commands`, guest, { type: 'next', expectedPlaybackRevision: state.playbackRevision, commandId: crypto.randomUUID() })).status()).toBe(403);
  await fixture.ref.update({ positionMs: 60000, playbackUpdatedAt: Date.now(), leaderUid: fixture.owner.localId, leaderClientId: 'offline-client', leaseExpiresAt: Date.now() + 25000 });
  const expired = await fixture.room();
  expect((await post(request, `/api/islands/${fixture.id}/commands`, guest, { type: 'advance', ...proof(expired), commandId: crypto.randomUUID() })).status()).toBe(200);
  expect((await post(request, `/api/islands/${fixture.id}/members`, fixture.owner, { type: 'transfer', targetUid: guest.localId })).status()).toBe(200);
  const transferred = await fixture.room();
  expect(transferred.ownerUid).toBe(guest.localId);
  expect(transferred.playbackRevision).toBe((state.playbackRevision ?? 0) + 1);
});
test('completion, stale instances and receipt reuse cannot replay or skip a newer song', async ({ request }) => {
  const fixture = await setup(request, 1);
  await fixture.ref.update({ positionMs: 60000, playbackUpdatedAt: Date.now() });
  const expired = await fixture.room();
  const commandId = crypto.randomUUID();
  const command = { type: 'advance', ...proof(expired), commandId };
  const responses = await Promise.all([post(request, `/api/islands/${fixture.id}/commands`, fixture.owner, command), post(request, `/api/islands/${fixture.id}/commands`, fixture.owner, command)]);
  expect(responses.map(response => response.status())).toEqual([200, 200]);
  const ended = await fixture.room(); expect(ended).toMatchObject({ isPlaying: false, positionMs: 60000 });
  expect((await post(request, `/api/islands/${fixture.id}/commands`, fixture.owner, { type: 'play', expectedPlaybackRevision: ended.playbackRevision, commandId: crypto.randomUUID() })).status()).toBe(200);
  const replay = await fixture.room(); expect(replay.trackEpoch).toBe((ended.trackEpoch ?? 0) + 1);
  expect((await post(request, `/api/islands/${fixture.id}/commands`, fixture.owner, { ...command, commandId: crypto.randomUUID() })).status()).toBe(409);
  expect((await post(request, `/api/islands/${fixture.id}/commands`, fixture.owner, { type: 'pause', expectedPlaybackRevision: replay.playbackRevision, commandId })).status()).toBe(409);
  expect(await fixture.room()).toMatchObject({ playbackRevision: replay.playbackRevision, trackEpoch: replay.trackEpoch, isPlaying: true });
});
test('legacy metadata is admitted during completion and permits explicit replay', async ({ request }) => {
  const fixture = await setup(request, 1);
  const room = await fixture.room();
  await fixture.ref.update({ playlist: room.playlist.map(({ durationMs: _duration, ...song }) => song), positionMs: 60000, playbackUpdatedAt: Date.now() });
  const expired = await fixture.room();
  expect((await post(request, `/api/islands/${fixture.id}/commands`, fixture.owner, { type: 'advance', ...proof(expired), commandId: crypto.randomUUID() })).status()).toBe(200);
  const ended = await fixture.room();
  expect(ended.playlist[0].durationMs).toBe(60000);
  expect((await post(request, `/api/islands/${fixture.id}/commands`, fixture.owner, { type: 'play', expectedPlaybackRevision: ended.playbackRevision, commandId: crypto.randomUUID() })).status()).toBe(200);
  expect(await fixture.room()).toMatchObject({ positionMs: 0, isPlaying: true, trackEpoch: (ended.trackEpoch ?? 0) + 1 });
});
test('duration metadata is authenticated, member-only and read-only', async ({ request }) => {
  const fixture = await setup(request, 1);
  const outsider = await identity(request);
  const endpoint = `${process.env.MELODY_PREVIEW_ORIGIN || 'http://127.0.0.1:3100'}/api/islands/${fixture.id}/playback`;
  expect((await request.get(endpoint)).status()).toBe(401);
  expect((await request.get(endpoint, { headers: { Authorization: `Bearer ${outsider.idToken}` } })).status()).toBe(403);
  const before = await fixture.room();
  const response = await request.get(endpoint, { headers: { Authorization: `Bearer ${fixture.owner.idToken}` } });
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.json()).toMatchObject({ videoId: ids[0], durationMs: 60000, trackEpoch: before.trackEpoch });
  expect(await fixture.room()).toEqual(before);
});
