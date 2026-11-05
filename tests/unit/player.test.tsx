import type { PlayerTarget } from '../../lib/types';
type PlayerEvent = { target: PlayerTarget; data?: number };
interface PlayerCallbacks {
  onReady(event: PlayerEvent): void;
  onStateChange(event: PlayerEvent): void;
  onAutoplayBlocked(): void;
}
// @vitest-environment jsdom
import React, { createRef } from 'react';
import type { PlayerHandle } from '../../lib/types';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
const hooks = vi.hoisted(() => ({
  ready: (_event: PlayerEvent) => {},
  state: (_event: PlayerEvent) => {},
  blocked: () => {},
}));
vi.mock('../../components/YouTubeFrame', () => ({
  default: (props: PlayerCallbacks) => {
    hooks.ready = props.onReady;
    hooks.state = props.onStateChange;
    hooks.blocked = props.onAutoplayBlocked;
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
  expect(target.seekTo).not.toHaveBeenCalled();
  target.getCurrentTime.mockReturnValue(0);
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


it('waits through buffering and corrects sustained drift once without replay storms', () => {
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  target.getCurrentTime.mockReturnValue(9);
  const playing = { ...base, isPlaying: true, positionMs: 0 };
  render(<SyncedPlayer session={playing} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  target.getPlayerState.mockReturnValue(3);
  act(() => hooks.state({ data: 3, target }));
  act(() => {
    vi.advanceTimersByTime(12000);
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(target.seekTo).not.toHaveBeenCalled();
  expect(target.playVideo).not.toHaveBeenCalled();
  target.getPlayerState.mockReturnValue(1);
  act(() => hooks.state({ data: 1, target }));
  act(() => vi.advanceTimersByTime(4000));
  expect(target.seekTo).toHaveBeenCalledOnce();
  act(() => vi.advanceTimersByTime(5000));
  expect(target.seekTo).toHaveBeenCalledOnce();
  expect(target.playVideo).not.toHaveBeenCalled();
  expect(callbacks.onEnded).not.toHaveBeenCalled();
});

it('does not seek for a short drift spike or small clock noise', () => {
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  target.getCurrentTime.mockReturnValue(9);
  const playing = { ...base, isPlaying: true, positionMs: 0 };
  render(<SyncedPlayer session={playing} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  target.getCurrentTime.mockImplementation(() => (Date.now() - 1000) / 1000 - 0.5);
  act(() => vi.advanceTimersByTime(12000));
  expect(target.seekTo).not.toHaveBeenCalled();
  target.getCurrentTime.mockReturnValue(0);
  act(() => vi.advanceTimersByTime(2000));
  target.getCurrentTime.mockImplementation(() => (Date.now() - 1000) / 1000);
  act(() => vi.advanceTimersByTime(2000));
  expect(target.seekTo).not.toHaveBeenCalled();
});

it('a listening gesture catches up to the current room position without advancing the room', () => {
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  const ref = createRef<PlayerHandle>();
  const playing = { ...base, isPlaying: true, positionMs: 0 };
  render(<SyncedPlayer ref={ref} session={playing} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  target.getPlayerState.mockReturnValue(2);
  target.getCurrentTime.mockReturnValue(0);
  act(() => vi.advanceTimersByTime(2000));
  target.playVideo.mockClear();
  act(() => ref.current?.enableAudio());
  expect(target.seekTo).toHaveBeenCalledWith(11, true);
  expect(target.unMute).toHaveBeenCalled();
  expect(target.playVideo).toHaveBeenCalledOnce();
  expect(callbacks.onEnded).not.toHaveBeenCalled();
});

it('starts a cued paused track when the room switches to playing', () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  target.getPlayerState.mockReturnValue(5);
  const view = render(<SyncedPlayer session={base} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  view.rerender(<SyncedPlayer session={{ ...base, isPlaying: true }} clockOffset={0} {...callbacks} />);
  expect(target.playVideo).toHaveBeenCalledOnce();
});

it('stops retrying blocked autoplay until the listener activates audio', () => {
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  const ref = createRef<PlayerHandle>();
  const playing = { ...base, isPlaying: true, positionMs: 0 };
  render(<SyncedPlayer ref={ref} session={playing} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  act(() => hooks.blocked());
  target.getPlayerState.mockReturnValue(2);
  target.getCurrentTime.mockReturnValue(0);
  act(() => {
    vi.advanceTimersByTime(30000);
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(target.playVideo).not.toHaveBeenCalled();
  expect(target.seekTo).not.toHaveBeenCalled();
  expect(callbacks.onBlocked).toHaveBeenCalledOnce();
  act(() => ref.current?.enableAudio());
  expect(target.playVideo).toHaveBeenCalledOnce();
  expect(target.seekTo).toHaveBeenCalledWith(39, true);
  expect(callbacks.onEnded).not.toHaveBeenCalled();
});


it('applies an authoritative play command to an unstarted cued player', () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  target.getPlayerState.mockReturnValue(-1);
  const view = render(<SyncedPlayer session={base} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  view.rerender(<SyncedPlayer session={{ ...base, isPlaying: true }} clockOffset={0} {...callbacks} />);
  expect(target.playVideo).toHaveBeenCalledOnce();
});

it('never restarts an ended track while waiting for authoritative advancement', () => {
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  const playing = { ...base, isPlaying: true, positionMs: 0 };
  render(<SyncedPlayer session={playing} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  target.getPlayerState.mockReturnValue(0);
  act(() => vi.advanceTimersByTime(30000));
  expect(target.playVideo).not.toHaveBeenCalled();
  expect(target.seekTo).not.toHaveBeenCalled();
});

it('aligns the first decoded playback once, then leaves a progressing clock alone', () => {
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  target.getCurrentTime.mockReturnValue(0);
  const playing = { ...base, isPlaying: true, positionMs: 0 };
  render(<SyncedPlayer session={playing} clockOffset={0} {...callbacks} />);
  act(() => hooks.ready({ target }));
  act(() => {
    hooks.state({ data: 1, target });
    hooks.state({ data: 1, target });
  });
  expect(target.seekTo).toHaveBeenCalledOnce();
  expect(target.seekTo).toHaveBeenCalledWith(9, true);
  target.getCurrentTime.mockImplementation(() => (Date.now() - 1000) / 1000);
  act(() => vi.advanceTimersByTime(30000));
  expect(target.seekTo).toHaveBeenCalledOnce();
  expect(target.playVideo).not.toHaveBeenCalled();
});
