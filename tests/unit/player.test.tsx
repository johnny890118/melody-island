// @vitest-environment jsdom
import React, { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Playback, PlayerHandle, PlayerTarget, Room } from '../../lib/types';
type Event = { target: PlayerTarget; data?: number };
interface Events { onReady(event: Event): void; onStateChange(event: Event): void; onAutoplayBlocked(): void }
const hooks = vi.hoisted(() => ({ ready: (_event: Event) => {}, state: (_event: Event) => {}, blocked: () => {} }));
vi.mock('../../components/YouTubeFrame', () => ({ default: (props: Events) => {
  hooks.ready = props.onReady; hooks.state = props.onStateChange; hooks.blocked = props.onAutoplayBlocked; return null;
} }));
import SyncedPlayer from '../../components/SyncedPlayer';
const target = {
  loadVideoById: vi.fn(), cueVideoById: vi.fn(), stopVideo: vi.fn(),
  getCurrentTime: vi.fn<() => number>(), getPlayerState: vi.fn<() => number>(),
  getVideoUrl: vi.fn<() => string>(), getDuration: vi.fn<() => number>(), seekTo: vi.fn(),
  playVideo: vi.fn(), pauseVideo: vi.fn(), mute: vi.fn(), unMute: vi.fn(),
} satisfies PlayerTarget;
const base: Playback & Partial<Room> = {
  currentVideo: 'aaaaaaaaaaa', positionMs: 12000, isPlaying: false, playbackUpdatedAt: 1000,
  playbackRevision: 0, trackEpoch: 0,
  playlist: [{ videoId: 'aaaaaaaaaaa', title: 'Content', thumbnail: '', durationMs: 600000 }],
};
const callbacks = { onReady: vi.fn(), onError: vi.fn(), onAdvance: vi.fn(), onBlocked: vi.fn(), onPlaying: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks(); target.getCurrentTime.mockReturnValue(12); target.getPlayerState.mockReturnValue(1);
  target.getVideoUrl.mockReturnValue('https://www.youtube.com/watch?v=aaaaaaaaaaa'); target.getDuration.mockReturnValue(600);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it('cues paused content once and prevents native local playback from changing the room', () => {
  render(<SyncedPlayer session={base} {...callbacks} />); act(() => hooks.ready({ target }));
  expect(target.cueVideoById).toHaveBeenCalledExactlyOnceWith('aaaaaaaaaaa', 12);
  expect(target.loadVideoById).not.toHaveBeenCalled(); expect(target.pauseVideo).toHaveBeenCalledOnce();
  act(() => hooks.state({ data: 1, target })); expect(callbacks.onAdvance).not.toHaveBeenCalled();
});
it('loads the authoritative position and stops only when a newer snapshot clears content', () => {
  vi.spyOn(Date, 'now').mockReturnValue(4000);
  const view = render(<SyncedPlayer session={{ ...base, positionMs: 2000, isPlaying: true }} {...callbacks} />);
  act(() => hooks.ready({ target })); expect(target.loadVideoById).toHaveBeenCalledExactlyOnceWith('aaaaaaaaaaa', 5);
  view.rerender(<SyncedPlayer session={{ ...base, currentVideo: '', playbackRevision: 1 }} {...callbacks} />);
  expect(target.stopVideo).toHaveBeenCalledOnce();
});
it('applies a new authoritative play to cued and unstarted states without reloading the resource', () => {
  vi.spyOn(Date, 'now').mockReturnValue(1000); target.getPlayerState.mockReturnValue(5);
  const view = render(<SyncedPlayer session={base} {...callbacks} />); act(() => hooks.ready({ target }));
  target.getPlayerState.mockReturnValue(-1);
  view.rerender(<SyncedPlayer session={{ ...base, isPlaying: true, playbackRevision: 1 }} {...callbacks} />);
  expect(target.playVideo).toHaveBeenCalledOnce(); expect(target.loadVideoById).not.toHaveBeenCalled();
});
it('a same-video replay is a seek within the existing iframe, fenced by the new epoch', () => {
  vi.spyOn(Date, 'now').mockReturnValue(10000);
  const view = render(<SyncedPlayer session={{ ...base, isPlaying: true }} {...callbacks} />); act(() => hooks.ready({ target }));
  view.rerender(<SyncedPlayer session={{ ...base, isPlaying: true, positionMs: 0, playbackUpdatedAt: 10000, playbackRevision: 1, trackEpoch: 1 }} {...callbacks} />);
  expect(target.loadVideoById).toHaveBeenCalledOnce(); expect(target.seekTo).toHaveBeenCalledExactlyOnceWith(0, true);
});
it('metadata and lease changes do not recreate or reload the media resource', () => {
  const view = render(<SyncedPlayer session={base} {...callbacks} />); act(() => hooks.ready({ target }));
  for (let version = 1; version <= 20; version++)
    view.rerender(<SyncedPlayer session={{ ...base, version, leaseExpiresAt: version * 10000 }} {...callbacks} />);
  expect(target.cueVideoById).toHaveBeenCalledOnce(); expect(target.seekTo).not.toHaveBeenCalled();
});
it('does not accept stale target events after replacing an iframe', () => {
  vi.spyOn(Date, 'now').mockReturnValue(1000);
  render(<SyncedPlayer session={{ ...base, isPlaying: true }} {...callbacks} />); act(() => hooks.ready({ target }));
  const replacement = { ...target, loadVideoById: vi.fn() };
  act(() => hooks.ready({ target: replacement }));
  expect(replacement.loadVideoById).toHaveBeenCalledOnce();
  act(() => hooks.state({ data: 0, target })); expect(callbacks.onAdvance).not.toHaveBeenCalled();
});
it('keeps paused listening activation local, then joins a playing room from the latest progress', () => {
  vi.spyOn(Date, 'now').mockReturnValue(10000); target.getPlayerState.mockReturnValue(2);
  const ref = createRef<PlayerHandle>();
  const view = render(<SyncedPlayer ref={ref} session={base} {...callbacks} />); act(() => hooks.ready({ target }));
  act(() => ref.current?.enableAudio()); expect(target.unMute).toHaveBeenCalled(); expect(target.playVideo).not.toHaveBeenCalled();
  target.getCurrentTime.mockReturnValue(0);
  view.rerender(<SyncedPlayer ref={ref} session={{ ...base, positionMs: 0, isPlaying: true, playbackRevision: 1 }} {...callbacks} />);
  target.playVideo.mockClear();
  act(() => ref.current?.enableAudio()); expect(target.playVideo).toHaveBeenCalledOnce();
  expect(target.seekTo).toHaveBeenCalledWith(9, true); expect(callbacks.onAdvance).not.toHaveBeenCalled();
});
it('does not retry blocked autoplay on visibility or reconnect without a gesture', () => {
  vi.useFakeTimers(); vi.setSystemTime(10000);
  const ref = createRef<PlayerHandle>();
  render(<SyncedPlayer ref={ref} session={{ ...base, positionMs: 0, isPlaying: true }} {...callbacks} />);
  act(() => hooks.ready({ target })); act(() => hooks.blocked());
  target.getPlayerState.mockReturnValue(2); target.getCurrentTime.mockReturnValue(0);
  act(() => { vi.advanceTimersByTime(30000); window.dispatchEvent(new Event('online')); document.dispatchEvent(new Event('visibilitychange')); });
  expect(target.playVideo).not.toHaveBeenCalled(); expect(target.seekTo).not.toHaveBeenCalled();
  act(() => ref.current?.enableAudio()); expect(target.playVideo).toHaveBeenCalledOnce(); expect(target.seekTo).toHaveBeenCalledWith(39, true);
});
it('does not seek or replay a buffering player, including manual local resync', () => {
  vi.spyOn(Date, 'now').mockReturnValue(10000);
  const ref = createRef<PlayerHandle>();
  render(<SyncedPlayer ref={ref} session={{ ...base, positionMs: 0, isPlaying: true }} {...callbacks} />);
  act(() => hooks.ready({ target })); target.getPlayerState.mockReturnValue(3);
  act(() => { hooks.state({ data: 3, target }); ref.current?.sync(); window.dispatchEvent(new Event('online')); });
  expect(target.seekTo).not.toHaveBeenCalled(); expect(target.playVideo).not.toHaveBeenCalled();
});
it('rejects short advertising-like ended events against the admitted content duration', () => {
  vi.spyOn(Date, 'now').mockReturnValue(100000);
  render(<SyncedPlayer session={{ ...base, positionMs: 0, isPlaying: true }} {...callbacks} />); act(() => hooks.ready({ target }));
  target.getDuration.mockReturnValue(10); target.getCurrentTime.mockReturnValue(9.9); target.getPlayerState.mockReturnValue(0);
  act(() => hooks.state({ data: 0, target })); expect(callbacks.onAdvance).not.toHaveBeenCalled();
});
it('delivers only an expired authoritative deadline, independent of local buffering', () => {
  vi.spyOn(Date, 'now').mockReturnValue(601000); target.getPlayerState.mockReturnValue(3);
  render(<SyncedPlayer session={{ ...base, positionMs: 0, isPlaying: true }} canRelay {...callbacks} />);
  act(() => hooks.ready({ target })); expect(callbacks.onAdvance).toHaveBeenCalledOnce();
  expect(target.loadVideoById).not.toHaveBeenCalled();
});
it('does not let a non-leader deadline request advance the room', () => {
  vi.spyOn(Date, 'now').mockReturnValue(601000);
  render(<SyncedPlayer session={{ ...base, positionMs: 0, isPlaying: true }} canRelay={false} {...callbacks} />);
  act(() => hooks.ready({ target })); expect(callbacks.onAdvance).not.toHaveBeenCalled();
});
it('skips hidden polling and removes reconnect and visibility listeners on teardown', () => {
  vi.useFakeTimers(); vi.setSystemTime(1000);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  const view = render(<SyncedPlayer session={base} {...callbacks} />); act(() => hooks.ready({ target }));
  const reads = target.getCurrentTime.mock.calls.length; act(() => vi.advanceTimersByTime(10000));
  expect(target.getCurrentTime).toHaveBeenCalledTimes(reads);
  view.unmount(); act(() => { window.dispatchEvent(new Event('online')); document.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(20000); });
  expect(target.getCurrentTime).toHaveBeenCalledTimes(reads);
});
it('reports startup failure and cancels the timer after attachment', () => {
  vi.useFakeTimers(); const view = render(<SyncedPlayer session={base} {...callbacks} />);
  act(() => vi.advanceTimersByTime(15000)); expect(callbacks.onError).toHaveBeenCalledOnce();
  view.unmount(); callbacks.onError.mockClear();
  render(<SyncedPlayer session={base} {...callbacks} />); act(() => hooks.ready({ target }));
  act(() => vi.advanceTimersByTime(20000)); expect(callbacks.onError).not.toHaveBeenCalled();
});
it('delivers pause/resume across delayed iframe acknowledgements and confirms progress on a later tick', () => {
  vi.useFakeTimers(); vi.setSystemTime(1000); target.getCurrentTime.mockReturnValue(12);
  const view = render(<SyncedPlayer session={{ ...base, isPlaying: true }} {...callbacks} />);
  act(() => hooks.ready({ target }));
  target.getCurrentTime.mockReturnValue(13);
  act(() => vi.advanceTimersByTime(1000));
  view.rerender(<SyncedPlayer session={{ ...base, positionMs: 13000, playbackUpdatedAt: 2000, playbackRevision: 1 }} {...callbacks} />);
  expect(target.pauseVideo).toHaveBeenCalled();
  view.rerender(<SyncedPlayer session={{ ...base, isPlaying: true, positionMs: 13000, playbackUpdatedAt: 2000, playbackRevision: 2 }} {...callbacks} />);
  expect(target.playVideo).toHaveBeenCalledOnce();
  target.getPlayerState.mockReturnValue(2);
  act(() => hooks.state({ data: 2, target }));
  expect(callbacks.onBlocked).not.toHaveBeenCalled();
  target.getPlayerState.mockReturnValue(1); target.getCurrentTime.mockReturnValue(14);
  act(() => vi.advanceTimersByTime(1000));
  expect(callbacks.onPlaying).toHaveBeenCalledTimes(2);
  expect(target.loadVideoById).toHaveBeenCalledOnce();
  expect(callbacks.onAdvance).not.toHaveBeenCalled();
});
it('acknowledges native iframe activation and does not keep the listening prompt latched', () => {
  vi.useFakeTimers(); vi.setSystemTime(1000);
  const view = render(<SyncedPlayer session={{ ...base, isPlaying: true }} {...callbacks} />);
  act(() => hooks.ready({ target })); act(() => hooks.blocked());
  target.getCurrentTime.mockReturnValue(13); act(() => hooks.state({ data: 1, target }));
  expect(callbacks.onPlaying).not.toHaveBeenCalled();
  target.getCurrentTime.mockReturnValue(14); act(() => vi.advanceTimersByTime(1000));
  expect(callbacks.onPlaying).toHaveBeenCalledOnce();
  view.rerender(<SyncedPlayer session={{ ...base, positionMs: 14000, playbackUpdatedAt: 2000, playbackRevision: 1 }} {...callbacks} />);
  target.getPlayerState.mockReturnValue(2);
  view.rerender(<SyncedPlayer session={{ ...base, isPlaying: true, positionMs: 14000, playbackUpdatedAt: 2000, playbackRevision: 2 }} {...callbacks} />);
  expect(target.playVideo).toHaveBeenCalledOnce();
  expect(target.loadVideoById).toHaveBeenCalledOnce();
});
