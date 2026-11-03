interface Counter {
  count: number;
  until: number;
}
import { beforeEach, expect, it, vi } from 'vitest';
const store = vi.hoisted(() => ({ data: undefined as Counter | undefined, revision: 0 }));
vi.mock('../../lib/server/firebase', () => ({
  adminServices: () => ({
    db: {
      doc: () => ({
        async get() {
          const snapshot = { data: store.data && { ...store.data }, revision: store.revision };
          return {
            exists: Boolean(snapshot.data),
            data: () => snapshot.data,
            updateTime: snapshot.revision,
          };
        },
        async update(data: Counter, condition: { lastUpdateTime: number }) {
          if (condition.lastUpdateTime !== store.revision)
            throw Object.assign(new Error('Conflict'), { code: 9 });
          store.data = data;
          store.revision++;
        },
        async create(data: Counter) {
          if (store.data) throw Object.assign(new Error('Exists'), { code: 6 });
          store.data = data;
          store.revision++;
        },
      }),
    },
  }),
}));
import { rateLimit } from '../../lib/server/http';
beforeEach(() => {
  store.data = undefined;
  store.revision = 0;
  vi.restoreAllMocks();
});
it('never exceeds the budget when initial requests race', async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 10 }, () => rateLimit('user', 'test', 3)),
  );
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(3);
  expect(
    results
      .filter((result) => result.status === 'rejected')
      .every((result) => result.reason.status === 429),
  ).toBe(true);
  expect(store.data?.count).toBe(3);
});
it('resets an expired window', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
  await rateLimit('user', 'test', 1, 100);
  await expect(rateLimit('user', 'test', 1, 100)).rejects.toHaveProperty('status', 429);
  clock.mockReturnValue(1101);
  await expect(rateLimit('user', 'test', 1, 100)).resolves.toBeUndefined();
  expect(store.data?.count).toBe(1);
});
