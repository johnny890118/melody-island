import type { PlayerTarget } from '../../lib/types';
type PlayerEvent = { target: PlayerTarget; data?: number };
interface PlayerCallbacks {
  onReady(event: PlayerEvent): void;
  onStateChange(event: PlayerEvent): void;
}
// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
const hooks = vi.hoisted(() => ({
  ready: (_event: PlayerEvent) => {},
  state: (_event: PlayerEvent) => {},
}));
vi.mock('react-youtube', () => ({
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
});
afterEach(() => {
  cleanup();
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
