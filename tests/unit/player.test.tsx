import type { PlayerTarget } from '../../lib/types';
type PlayerEvent = { target: PlayerTarget; data?: number };
interface PlayerCallbacks {
  onReady(event: PlayerEvent): void;
  onStateChange(event: PlayerEvent): void;
}
// @vitest-environment jsdom
import React, { createRef } from 'react';
import type { PlayerHandle } from '../../lib/types';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
const hooks = vi.hoisted(() => ({
  ready: (_event: PlayerEvent) => {},
  state: (_event: PlayerEvent) => {},
}));
vi.mock('../../components/YouTubeFrame', () => ({
  default: (props: PlayerCallbacks) => {
    hooks.ready = props.onReady;
    hooks.state = props.onStateChange;
    return null;
  },
}));
import SyncedPlayer from '../../components/SyncedPlayer';
const target = {
  loadVideoById: vi.fn(),
  cueVideoById: vi.fn(),
  stopVideo: vi.fn(),
  getCurrentTime: vi.fn<() => number>(),
  getPlayerState: vi.fn<() => number>(),
  getVideoUrl: vi.fn<() => string>(),
  getDuration: vi.fn<() => number>(),
  seekTo: vi.fn(),
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  mute: vi.fn(),
  unMute: vi.fn(),
  addEventListener: vi.fn(),
} satisfies PlayerTarget;
const base = {
  currentVideo: 'aaaaaaaaaaa',
  positionMs: 12000,
  isPlaying: false,
  playbackUpdatedAt: 1000,
};
const callbacks = { onReady: vi.fn(), onError: vi.fn(), onEnded: vi.fn(), onBlocked: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  target.getCurrentTime.mockReturnValue(12);
  target.getPlayerState.mockReturnValue(1);
  target.getVideoUrl.mockReturnValue('https://www.youtube.com/watch?v=aaaaaaaaaaa');
  target.getDuration.mockReturnValue(60);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it('cues a newly joined paused track without loading it into playback', () => {
  render(<SyncedPlayer session={base} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  expect(target.cueVideoById).toHaveBeenCalledWith('aaaaaaaaaaa', 12);
  expect(target.loadVideoById).not.toHaveBeenCalled();
  act(() => hooks.state({ data: 1, target }));
  expect(target.pauseVideo).toHaveBeenCalled();
});
it('loads a playing track using the shared server timeline, then clears it', () => {
  vi.spyOn(Date, 'now').mockReturnValue(4000);
  const view = render(
    <SyncedPlayer
      session={{ ...base, positionMs: 2000, isPlaying: true }}
      clockOffset={0}
      {...callbacks}
    />,
  );
  act(() => hooks.ready({ target }));
  expect(target.loadVideoById).toHaveBeenCalledWith('aaaaaaaaaaa', 5);
  view.rerender(
    <SyncedPlayer session={{ ...base, currentVideo: '' }} clockOffset={0} {...callbacks} />,
  );
  expect(target.stopVideo).toHaveBeenCalled();
});
it('does not advance when a paused player emits ended', () => {
  render(<SyncedPlayer session={base} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  act(() => hooks.state({ data: 0, target }));
  expect(callbacks.onEnded).not.toHaveBeenCalled();
});

it('enabling audio preserves a paused room and plays only a playing room', () => {
  const ref = createRef<PlayerHandle>();
  const view = render(<SyncedPlayer ref={ref} session={base} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  act(() => ref.current?.enableAudio());
  expect(target.unMute).toHaveBeenCalled();
  expect(target.playVideo).not.toHaveBeenCalled();
  view.rerender(
    <SyncedPlayer
      ref={ref}
      session={{ ...base, isPlaying: true }}
      clockOffset={0}
      {...callbacks}
    />,
  );
  target.playVideo.mockClear();
  act(() => ref.current?.enableAudio());
  expect(target.playVideo).toHaveBeenCalledOnce();
});
it('applies a corrected canonical position even if the playback timestamp is unchanged', () => {
  const view = render(<SyncedPlayer session={base} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  view.rerender(
    <SyncedPlayer session={{ ...base, positionMs: 30000 }} clockOffset={0} {...callbacks} />,
  );
  expect(target.seekTo).toHaveBeenCalledWith(30, true);
});
it('skips hidden-tab polling, resyncs on return and removes reconnect listeners on unmount', () => {
  vi.useFakeTimers();
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  const view = render(<SyncedPlayer session={base} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  target.seekTo.mockClear();
  act(() => vi.advanceTimersByTime(10000));
  expect(target.seekTo).not.toHaveBeenCalled();
  hidden.mockReturnValue(false);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(target.seekTo).toHaveBeenCalledWith(12, true);
  target.seekTo.mockClear();
  act(() => window.dispatchEvent(new Event('online')));
  expect(target.seekTo).toHaveBeenCalledOnce();
  view.unmount();
  target.seekTo.mockClear();
  act(() => {
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(20000);
  });
  expect(target.seekTo).not.toHaveBeenCalled();
});
it('reports a connection timeout, but cancels it once the player is ready', () => {
  vi.useFakeTimers();
  const first = render(<SyncedPlayer session={base} clockOffset={0} {...callbacks} />);
  act(() => vi.advanceTimersByTime(15000));
  expect(callbacks.onError).toHaveBeenCalledOnce();
  first.unmount();
  callbacks.onError.mockClear();
  render(<SyncedPlayer session={base} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  act(() => vi.advanceTimersByTime(20000));
  expect(callbacks.onError).not.toHaveBeenCalled();
});

it('rejects a delayed ended callback after a track switch and advances the actual current track', () => {
  vi.spyOn(Date, 'now').mockReturnValue(61000);
  const playing = { ...base, isPlaying: true, positionMs: 0 };
  const view = render(<SyncedPlayer session={playing} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  const next = { ...playing, currentVideo: 'bbbbbbbbbbb' };
  view.rerender(<SyncedPlayer session={next} clockOffset={0} {...callbacks} />);
  target.getPlayerState.mockReturnValue(0);
  act(() => hooks.state({ data: 0, target }));
  expect(callbacks.onEnded).not.toHaveBeenCalled();
  target.getVideoUrl.mockReturnValue('https://www.youtube.com/watch?v=bbbbbbbbbbb');
  act(() => hooks.state({ data: 0, target }));
  expect(callbacks.onEnded).toHaveBeenCalledWith(next);
});

it('ignores a stale ended event after replaying the same video from the start', () => {
  vi.spyOn(Date, 'now').mockReturnValue(61000);
  const replay = { ...base, positionMs: 0, isPlaying: true, playbackUpdatedAt: 61000 };
  render(<SyncedPlayer session={replay} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  target.getPlayerState.mockReturnValue(0);
  act(() => hooks.state({ data: 0, target }));
  expect(callbacks.onEnded).not.toHaveBeenCalled();
});
