import type { Locator } from '@playwright/test';
import { parseRoom } from '../../lib/validation';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { adminDb, identity, login, post } from './helpers';

test('homepage preserves real 3D at desktop and mobile, with accessible join form', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A little closer.' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在準備島嶼', { exact: false })).toHaveCount(0, { timeout: 30000 });
  await page.screenshot({ path: '.impeccable/review/desktop.png', fullPage: true });
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas is not rendered');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2);
  await page.mouse.up();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.impeccable/review/mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: '加入朋友的島嶼' }).click();
  await expect(page.getByLabel('島嶼 ID', { exact: true })).toBeVisible();
  await expect(page.getByLabel('島嶼密碼', { exact: true })).toBeVisible();
});

test('two friends join, refresh, share playback and concurrently delete by identity', async ({
  browser,
  request,
}) => {
  const owner = await identity(request);
  const guest = await identity(request);
  const created = await post(request, '/api/islands', owner, {
    islandName: '一起聽海',
    islandPassword: 'friends-only-123',
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const wrong = await post(request, `/api/islands/${id}/join`, guest, { islandPassword: 'wrong' });
  expect(wrong.status()).toBe(403);
  const joined = await post(request, `/api/islands/${id}/join`, guest, {
    islandPassword: 'friends-only-123',
  });
  expect(joined.status()).toBe(200);
  const songIds = ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'];
  for (const videoId of songIds) {
    const result = await post(request, `/api/islands/${id}/commands`, owner, {
      type: 'add',
      song: { videoId, title: `Song ${videoId}` },
      commandId: crypto.randomUUID(),
    });
    expect(result.status()).toBe(200);
  }
  const first = await browser.newContext();
  const second = await browser.newContext();
  const image = readFileSync('public/music-island-logo.png');
  for (const context of [first, second])
    await context.route('**/_next/image?**', (route) =>
      route.fulfill({ contentType: 'image/png', body: image }),
    );
  const a = await first.newPage();
  const b = await second.newPage();
  await login(a, owner);
  await login(b, guest);
  await Promise.all([a.goto(`/island/${id}`), b.goto(`/island/${id}`)]);
  await expect(a.getByRole('heading', { name: '一起聽海', exact: true })).toBeVisible();
  await expect(b.getByRole('heading', { name: '一起聽海', exact: true })).toBeVisible();
  await a.getByRole('button', { name: '播放', exact: true }).click();
  await expect(b.getByTestId('test-player')).toHaveAttribute('data-playing', 'true');
  await b.getByRole('button', { name: '暫停', exact: true }).click();
  await expect(a.getByTestId('test-player')).toHaveAttribute('data-playing', 'false');
  await b.reload();
  await expect(b.getByRole('heading', { name: '一起聽海', exact: true })).toBeVisible();
  await expect(b.getByTestId('test-player')).toHaveAttribute('data-playing', 'false');
  await a.screenshot({ path: '.impeccable/review/room-desktop.png', fullPage: true });
  const results = await Promise.all(
    songIds.slice(0, 2).map((videoId, index) =>
      post(request, `/api/islands/${id}/commands`, index ? guest : owner, {
        type: 'remove',
        videoId,
        commandId: crypto.randomUUID(),
      }),
    ),
  );
  expect(results.map((result) => result.status())).toEqual([200, 200]);
  await expect(b.getByRole('button', { name: `Song ${songIds[2]}`, exact: true })).toBeVisible();
  await expect(b.getByRole('button', { name: `Song ${songIds[0]}`, exact: true })).toHaveCount(0);
  const room = parseRoom((await adminDb().doc(`islands/${id}`).get()).data());
  expect(room.playlist.map((song) => song.videoId)).toEqual([songIds[2]]);
  expect('password' in room).toBe(false);
  await a.setViewportSize({ width: 390, height: 844 });
  await a.screenshot({ path: '.impeccable/review/room-mobile.png', fullPage: true });
  await a.setViewportSize({ width: 390, height: 600 });
  const searchInput = a.getByRole('textbox', { name: '搜尋歌曲或歌手' });
  await searchInput.focus();
  const transportTop = async () => {
    const box = await a.locator('.transport').boundingBox();
    if (!box) throw new Error('Transport is not rendered');
    return box.y;
  };
  const expectClear = async (locator: Locator) => {
    await expect
      .poll(async () => {
        const box = await locator.boundingBox();
        if (!box) throw new Error('Focused control is not rendered');
        return box.y + box.height - (await transportTop());
      })
      .toBeLessThan(-4);
  };
  await expectClear(searchInput);
  await a.keyboard.press('Tab');
  await expectClear(a.getByRole('button', { name: '搜尋', exact: true }));
  await a.screenshot({ path: '.impeccable/review/room-mobile-focused.png' });
  await a.locator('.room-management > summary').click();
  await a.getByRole('checkbox', { name: '切換上一首／下一首' }).focus();
  await expectClear(a.getByRole('checkbox', { name: '切換上一首／下一首' }));
  await a.screenshot({ path: '.impeccable/review/room-mobile-management-focus.png' });
  await first.close();
  await second.close();
});

test('backend rejects non-members, stale commands, and duplicate advances', async ({ request }) => {
  const owner = await identity(request);
  const stranger = await identity(request);
  const created = await post(request, '/api/islands', owner, {
    islandName: '權限測試',
    islandPassword: 'private-room-123',
  });
  const { id } = await created.json();
  const denied = await post(request, `/api/islands/${id}/commands`, stranger, {
    type: 'play',
    expectedVersion: 0,
    commandId: crypto.randomUUID(),
  });
  expect(denied.status()).toBe(403);
  for (const videoId of ['ddddddddddd', 'eeeeeeeeeee'])
    await post(request, `/api/islands/${id}/commands`, owner, {
      type: 'add',
      song: { videoId, title: videoId },
      commandId: crypto.randomUUID(),
    });
  const stale = await post(request, `/api/islands/${id}/commands`, owner, {
    type: 'play',
    expectedVersion: 0,
    commandId: crypto.randomUUID(),
  });
  expect(stale.status()).toBe(409);
  const command = { type: 'next', expectedVersion: 2, commandId: crypto.randomUUID() };
  const results = await Promise.all([
    post(request, `/api/islands/${id}/commands`, owner, command),
    post(request, `/api/islands/${id}/commands`, owner, command),
  ]);
  expect(results.map((result) => result.status())).toEqual([200, 200]);
  expect(parseRoom((await adminDb().doc(`islands/${id}`).get()).data()).version).toBe(3);
});

test('leadership expires safely, guests cannot forge the leader, and permissions are enforced', async ({
  request,
}) => {
  const owner = await identity(request);
  const guest = await identity(request);
  const created = await post(request, '/api/islands', owner, {
    islandName: '接手測試',
    islandPassword: 'friends-only-123',
  });
  const { id } = await created.json();
  await post(request, `/api/islands/${id}/join`, guest, { islandPassword: 'friends-only-123' });
  await post(request, `/api/islands/${id}/commands`, owner, {
    type: 'add',
    song: { videoId: 'fffffffffff', title: 'Synthetic test track' },
    commandId: crypto.randomUUID(),
  });
  await post(request, `/api/islands/${id}/commands`, owner, {
    type: 'lease',
    clientId: 'owner-client-id',
    commandId: crypto.randomUUID(),
  });
  const forged = await post(request, `/api/islands/${id}/commands`, guest, {
    type: 'ended',
    clientId: 'owner-client-id',
    videoId: '',
    expectedVersion: 1,
    commandId: crypto.randomUUID(),
  });
  expect(forged.status()).toBe(409);
  await adminDb().doc(`islands/${id}`).update({ leaseExpiresAt: 0 });
  await post(request, `/api/islands/${id}/commands`, guest, {
    type: 'lease',
    clientId: 'guest-client-id',
    commandId: crypto.randomUUID(),
  });
  expect(parseRoom((await adminDb().doc(`islands/${id}`).get()).data()).leaderUid).toBe(
    guest.localId,
  );
  const permissions = {
    guestsCanControlPlayback: false,
    guestsCanEditQueue: false,
    guestsCanSkip: false,
  };
  const changed = await post(request, `/api/islands/${id}/commands`, owner, {
    type: 'permissions',
    permissions,
    commandId: crypto.randomUUID(),
  });
  expect(changed.status()).toBe(200);
  const forbidden = await post(request, `/api/islands/${id}/commands`, guest, {
    type: 'remove',
    videoId: 'fffffffffff',
    commandId: crypto.randomUUID(),
  });
  expect(forbidden.status()).toBe(403);
  const transferred = await post(request, `/api/islands/${id}/members`, owner, {
    type: 'transfer',
    targetUid: guest.localId,
  });
  expect(transferred.status()).toBe(200);
  const left = await post(request, `/api/islands/${id}/members`, owner, { type: 'leave' });
  expect(left.status()).toBe(200);
  expect(parseRoom((await adminDb().doc(`islands/${id}`).get()).data()).memberCount).toBe(1);
});

test('20 isolated browser clients converge and the 21st member is refused', async ({
  browser,
  request,
}) => {
  test.setTimeout(120000);
  const users = [];
  for (let index = 0; index < 21; index++) users.push(await identity(request));
  const created = await post(request, '/api/islands', users[0], {
    islandName: '二十人的島',
    islandPassword: 'load-test-only-123',
  });
  const { id } = await created.json();
  const joinResults = await Promise.all(
    users
      .slice(1, 20)
      .map((user) =>
        post(request, `/api/islands/${id}/join`, user, { islandPassword: 'load-test-only-123' }),
      ),
  );
  expect(joinResults.every((result) => result.status() === 200)).toBe(true);
  const overflow = await post(request, `/api/islands/${id}/join`, users[20], {
    islandPassword: 'load-test-only-123',
  });
  expect(overflow.status()).toBe(409);
  await post(request, `/api/islands/${id}/commands`, users[0], {
    type: 'add',
    song: { videoId: 'ggggggggggg', title: 'Synthetic convergence test' },
    commandId: crypto.randomUUID(),
  });
  const contexts = [];
  const pages = [];
  try {
    for (const user of users.slice(0, 20)) {
      const context = await browser.newContext();
      contexts.push(context);
      await context.route('**/_next/image?**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'image/png',
          body: readFileSync('public/music-island-logo.png'),
        }),
      );
      const page = await context.newPage();
      await login(page, user);
      pages.push(page);
    }
    // Batches avoid turning local compilation/startup into the tested bottleneck.
    for (let index = 0; index < 20; index += 5)
      await Promise.all(
        pages.slice(index, index + 5).map(async (page) => {
          await page.goto(`/island/${id}`);
          await expect(page.getByTestId('test-player')).toBeVisible();
        }),
      );
    const start = Date.now();
    const result = await post(request, `/api/islands/${id}/commands`, users[0], {
      type: 'play',
      expectedVersion: 1,
      commandId: crypto.randomUUID(),
    });
    expect(result.status()).toBe(200);
    await Promise.all(
      pages.map((page) =>
        expect(page.getByTestId('test-player')).toHaveAttribute('data-playing', 'true'),
      ),
    );
    await test.info().attach('emulator-state-convergence', {
      body: JSON.stringify({
        clients: 20,
        elapsedMs: Date.now() - start,
        scope: 'Firestore state convergence with mock players, not real audio drift',
      }),
      contentType: 'application/json',
    });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test('search keeps the latest result when an earlier request is interrupted', async ({
  browser,
  request,
}) => {
  const owner = await identity(request);
  const created = await post(request, '/api/islands', owner, {
    islandName: '搜尋測試',
    islandPassword: 'search-test-123',
  });
  const { id } = await created.json();
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await login(page, owner);
    let releaseOld = () => {};
    const oldPending = new Promise<void>((resolve) => {
      releaseOld = resolve;
    });
    let firstSeen = () => {};
    const firstRequested = new Promise<void>((resolve) => {
      firstSeen = resolve;
    });
    await page.route('**/api/search?**', async (route) => {
      const q = new URL(route.request().url()).searchParams.get('q');
      if (q === 'old') {
        firstSeen();
        await oldPending;
      }
      try {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                videoId: q === 'old' ? 'hhhhhhhhhhh' : 'iiiiiiiiiii',
                title: q === 'old' ? 'Old result' : 'Latest result',
                thumbnail: 'https://i.ytimg.com/vi/iiiiiiiiiii/mqdefault.jpg',
              },
            ],
          }),
        });
      } catch {
        /* The old request was correctly cancelled. */
      }
    });
    await context.route('**/_next/image?**', (route) =>
      route.fulfill({
        contentType: 'image/png',
        body: readFileSync('public/music-island-logo.png'),
      }),
    );
    await page.goto(`/island/${id}`);
    const input = page.getByRole('textbox', { name: '搜尋歌曲或歌手' });
    await input.fill('old');
    await input.press('Enter');
    await firstRequested;
    await input.fill('new');
    await input.press('Enter');
    await expect(page.getByText('Latest result', { exact: true })).toBeVisible();
    releaseOld();
    await expect(page.getByText('Old result', { exact: true })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('a disconnected friend catches up with canonical playback after reconnecting', async ({ browser, request }) => {
  const owner = await identity(request);
  const guest = await identity(request);
  const created = await post(request, '/api/islands', owner, {
    islandName: '重連測試島', islandPassword: 'friends-only-123',
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  expect((await post(request, `/api/islands/${id}/join`, guest, { islandPassword: 'friends-only-123' })).status()).toBe(200);
  const context = await browser.newContext();
  try {
    const image = readFileSync('public/music-island-logo.png');
    await context.route('**/_next/image?**', (route) => route.fulfill({ contentType: 'image/png', body: image }));
    const page = await context.newPage();
    await login(page, guest);
    await page.goto(`/island/${id}`);
    await expect(page.getByTestId('test-player')).toBeVisible();
    await expect(page.getByText(/已連線 · 2 位成員/)).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByText(/離線 · 2 位成員/)).toBeVisible();
    expect((await post(request, `/api/islands/${id}/commands`, owner, {
      type: 'add', song: { videoId: 'ddddddddddd', title: '離線期間加入的新歌' }, commandId: crypto.randomUUID(),
    })).status()).toBe(200);
    const room = parseRoom((await adminDb().doc(`islands/${id}`).get()).data());
    expect((await post(request, `/api/islands/${id}/commands`, owner, {
      type: 'play', expectedVersion: room.version, commandId: crypto.randomUUID(),
    })).status()).toBe(200);
    await expect(page.getByTestId('test-player')).toHaveAttribute('data-video', '');
    await context.setOffline(false);
    await expect(page.getByTestId('test-player')).toHaveAttribute('data-video', 'ddddddddddd');
    await expect(page.getByTestId('test-player')).toHaveAttribute('data-playing', 'true');
    await expect(page.getByText(/已連線 · 2 位成員/)).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('test-player')).toHaveAttribute('data-video', 'ddddddddddd');
    await expect(page.getByTestId('test-player')).toHaveAttribute('data-playing', 'true');
  } finally {
    await context.close();
  }
});
