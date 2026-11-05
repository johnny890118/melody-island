import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../lib/server/http', () => ({ rateLimit: vi.fn(async () => {}) }));
import { contentDuration, parseDurationMs } from '../../lib/server/media';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('parses finite YouTube ISO8601 durations and rejects unknown/live lengths', () => {
  expect(parseDurationMs('PT1H2M3S')).toBe(3723000);
  expect(parseDurationMs('P1DT2S')).toBe(86402000);
  expect(() => parseDurationMs('PT0S')).toThrow(); expect(() => parseDurationMs('NaN')).toThrow();
});
it('never accepts synthetic metadata outside the exact demo configuration', async () => {
  vi.stubEnv('MELODY_TEST_MEDIA_DURATION_MS', '60000'); vi.stubEnv('FIREBASE_PROJECT_ID', 'production');
  expect(() => contentDuration('aaaaaaaaaaa')).toThrow('Unsafe');
  vi.stubEnv('MELODY_TEST_MEDIA_DURATION_MS', ''); vi.stubEnv('MELODY_REAL_MEDIA_FIXTURES', '{"aaaaaaaaaaa":60000}');
  expect(() => contentDuration('aaaaaaaaaaa')).toThrow('Unsafe');
});
it('normalizes server metadata and coalesces repeated provider lookups', async () => {
  vi.stubEnv('YOUTUBE_API_KEY', 'test-only');
  const fetcher = vi.fn(async () => Response.json({ items: [{ id: 'bbbbbbbbbbb', status: { embeddable: true }, contentDetails: { duration: 'PT2M' } }] }));
  vi.stubGlobal('fetch', fetcher);
  expect(await Promise.all([contentDuration('bbbbbbbbbbb'), contentDuration('bbbbbbbbbbb')])).toEqual([120000, 120000]);
  expect(fetcher).toHaveBeenCalledOnce();
});
it('rejects invalid metadata without caching a failed request forever', async () => {
  vi.stubEnv('YOUTUBE_API_KEY', 'test-only');
  const fetcher = vi.fn(async () => Response.json({ items: [] })); vi.stubGlobal('fetch', fetcher);
  await expect(contentDuration('ccccccccccc')).rejects.toThrow();
  await expect(contentDuration('ccccccccccc')).rejects.toThrow(); expect(fetcher).toHaveBeenCalledTimes(2);
});
it('does not parse client supplied duration into an add command', async () => {
  const { parseCommand } = await import('../../lib/validation');
  expect(parseCommand({ type: 'add', song: { videoId: 'aaaaaaaaaaa', title: 'A', durationMs: 1 } })).toEqual({ type: 'add', song: { videoId: 'aaaaaaaaaaa', title: 'A' } });
});
