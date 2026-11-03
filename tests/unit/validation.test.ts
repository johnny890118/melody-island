import { expect, it } from 'vitest';
import {
  parseCommand,
  parseMemberCommand,
  parseRoom,
  parseYouTubeResults,
} from '../../lib/validation';
it('rejects unsupported and malformed wire commands', () => {
  expect(() => parseCommand({ type: 'delete-room' })).toThrow();
  expect(() => parseCommand({ type: 'mode', shuffle: 'false' })).toThrow();
  expect(() =>
    parseCommand({ type: 'add', song: { videoId: 'aaaaaaaaaaa', title: 42 } }),
  ).toThrow();
  expect(() => parseMemberCommand({ type: 'transfer', targetUid: '../owner' })).toThrow();
});
it('never treats malformed external room snapshots as typed rooms', () => {
  expect(() => parseRoom(null)).toThrow();
  expect(() =>
    parseRoom({ schemaVersion: 2, memberUids: Array(21).fill('guest'), playlist: [] }),
  ).toThrow();
  expect(() => parseRoom({ schemaVersion: 1 })).toThrow('需要更新');
});
it('normalizes provider results and ignores untrusted thumbnail URLs', () => {
  expect(
    parseYouTubeResults({
      items: [
        {
          id: { videoId: 'aaaaaaaaaaa' },
          snippet: { title: 'A song', thumbnails: { default: { url: 'https://evil.test/image' } } },
        },
      ],
    }),
  ).toEqual([
    {
      videoId: 'aaaaaaaaaaa',
      title: 'A song',
      thumbnail: 'https://i.ytimg.com/vi/aaaaaaaaaaa/mqdefault.jpg',
    },
  ]);
  expect(() =>
    parseYouTubeResults({ items: [{ id: { videoId: '../secret' }, snippet: { title: 'Bad' } }] }),
  ).toThrow();
});
