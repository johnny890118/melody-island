import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  memberUids: ['member'],
  authenticate: vi.fn(async () => ({ uid: 'member' })),
  rateLimit: vi.fn(async (_uid: string, _bucket: string, _max: number, _window?: number) => {}),
}));
vi.mock('../../lib/server/http', async (original) => ({
  ...(await original<typeof import('../../lib/server/http')>()),
  authenticate: state.authenticate,
  rateLimit: state.rateLimit,
}));
vi.mock('../../lib/server/firebase', () => ({
  adminServices: () => ({ db: { doc: () => ({ get: async () => ({}) }) } }),
}));
vi.mock('../../lib/server/room', () => ({ requireRoom: () => ({ memberUids: state.memberUids }) }));
import { GET } from '../../app/api/search/route';
const request = () => new Request('https://island.test/api/search?islandId=abcdefghij&q=music');
beforeEach(() => {
  state.memberUids = ['member'];
  vi.clearAllMocks();
  vi.stubEnv('YOUTUBE_API_KEY', 'test-only');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        items: [{ id: { videoId: 'abcdefghijk' }, snippet: { title: 'Test song' } }],
      }),
    ),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('refuses search by a non-member before touching external quota', async () => {
  state.memberUids = ['someone-else'];
  expect((await GET(request())).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
  expect(state.rateLimit).not.toHaveBeenCalled();
});
it('checks per-user and shared service budgets before making the external call', async () => {
  expect((await GET(request())).status).toBe(200);
  expect(state.rateLimit).toHaveBeenCalledWith('member', 'search', 10);
  expect(state.rateLimit).toHaveBeenCalledWith('service', 'youtube-search', 80, 86400000);
  expect(fetch).toHaveBeenCalledOnce();
});
it('fails closed on invalid budget configuration', async () => {
  vi.stubEnv('YOUTUBE_SEARCH_DAILY_LIMIT', 'NaN');
  expect((await GET(request())).status).toBe(503);
  expect(fetch).not.toHaveBeenCalled();
});
it('does not spend external quota if the shared budget is exhausted', async () => {
  const { SessionError } = await import('../../lib/session');
  state.rateLimit
    .mockImplementationOnce(async () => {})
    .mockRejectedValueOnce(new SessionError('Limit', 429));
  expect((await GET(request())).status).toBe(429);
  expect(fetch).not.toHaveBeenCalled();
});
