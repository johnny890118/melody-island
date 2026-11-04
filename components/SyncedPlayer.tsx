'use client';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import YouTubeFrame from './YouTubeFrame';
import type { Playback, PlayerHandle, PlayerTarget, Room } from '@/lib/types';
interface SyncedPlayerProps {
  session: Playback & Partial<Room>;
  clockOffset: number;
  onEnded(session: Playback & Partial<Room>): void;
  onError(message: string): void;
  onReady(): void;
  onBlocked(): void;
}
import { expectedSeconds } from '@/lib/session';

const SyncedPlayer = forwardRef<PlayerHandle, SyncedPlayerProps>(function SyncedPlayer(
  { session, clockOffset, onEnded, onError, onReady, onBlocked },
  ref,
) {
  const player = useRef<PlayerTarget | null>(null);
  const latest = useRef(session);
  latest.current = session;
  const callbacks = useRef({ onEnded, onError, onReady, onBlocked });
  callbacks.current = { onEnded, onError, onReady, onBlocked };
  const offset = useRef(clockOffset);
  offset.current = clockOffset;
  const loaded = useRef('');
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const testPlayer =
    process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' &&
    process.env.NEXT_PUBLIC_TEST_PLAYER === 'true';
  const reportEnded = useCallback((target: PlayerTarget) => {
    const data = latest.current;
    if (
      target !== player.current ||
      !data.isPlaying ||
      !data.currentVideo ||
      loaded.current !== data.currentVideo
    )
      return;

    try {
      if (target.getPlayerState?.() !== 0) return;
      // The event identifies the iframe, not which load produced it.
      const url = new URL(target.getVideoUrl?.() ?? '');
      const duration = target.getDuration?.() ?? 0;
      const expected = expectedSeconds(data, Date.now() + offset.current);
      if (
        url.searchParams.get('v') !== data.currentVideo ||
        !Number.isFinite(duration) ||
        duration <= 0 ||
        expected < duration - 3
      )
        return;
    } catch {
      return;
    }
    callbacks.current.onEnded(data);
  }, []);
  const sync = useCallback((force = false) => {
    const target = player.current;
    const data = latest.current;
    if (!target) return;
    try {
      if (!data.currentVideo) {
        target.stopVideo();
        loaded.current = '';
        return;
      }
      const seconds = expectedSeconds(data, Date.now() + offset.current);
      if (loaded.current !== data.currentVideo) {
        loaded.current = data.currentVideo;
        if (data.isPlaying) target.loadVideoById(data.currentVideo, seconds);
        else target.cueVideoById(data.currentVideo, seconds);
      } else {
        if (force || Math.abs((target.getCurrentTime() || 0) - seconds) > 2)
          target.seekTo(seconds, true);
        if (data.isPlaying) target.playVideo();
        else target.pauseVideo();
      }
    } catch {
      callbacks.current.onError('播放器暫時無法同步，請點選重新同步。');
    }
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      sync: () => sync(true),
      toggleMute: () => setMuted((value) => !value),
      enableAudio: () => {
        try {
          player.current?.unMute();
          if (latest.current.isPlaying) player.current?.playVideo();
          setMuted(false);
        } catch {}
      },
    }),
    [sync],
  );
  useEffect(() => {
    if (ready) return;
    const timeout = setTimeout(
      () => callbacks.current.onError('連接 YouTube 逾時，請重試播放器或確認網路。'),
      15000,
    );
    return () => clearTimeout(timeout);
  }, [ready]);
  useEffect(() => {
    if (ready) sync();
  }, [
    ready,
    session.currentVideo,
    session.isPlaying,
    session.playbackUpdatedAt,
    session.positionMs,
    clockOffset,
    sync,
  ]);
  useEffect(() => {
    if (ready && player.current) reportEnded(player.current);
  }, [ready, session, reportEnded]);
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      if (!document.hidden) sync();
    }, 5000);
    const visible = () => {
      if (!document.hidden) sync(true);
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', visible);
    };
  }, [ready, sync]);
  useEffect(() => {
    if (ready && player.current) {
      if (muted) player.current.mute();
      else player.current.unMute();
    }
  }, [muted, ready]);
  useEffect(() => {
    if (!testPlayer) return;
    let seconds = 0;
    player.current = {
      loadVideoById: (_, value) => {
        seconds = value;
      },
      cueVideoById: (_, value) => {
        seconds = value;
      },
      getCurrentTime: () => seconds,
      seekTo: (value) => {
        seconds = value;
      },
      playVideo() {},
      pauseVideo() {},
      stopVideo() {},
      mute() {},
      unMute() {},
    };
    setReady(true);
    callbacks.current.onReady();
    return () => {
      player.current = null;
    };
  }, [testPlayer]);
  if (testPlayer)
    return (
      <div
        className="video-frame"
        data-testid="test-player"
        data-video={session.currentVideo}
        data-playing={session.isPlaying}
      >
        <div className="test-player-label">模擬播放器 · E2E 測試資料</div>
      </div>
    );
  return (
    <div className="video-frame">
      <YouTubeFrame
        onReady={({ target }) => {
          player.current = target;
          setReady(true);
          callbacks.current.onReady();
        }}
        onAutoplayBlocked={() => callbacks.current.onBlocked()}
        onError={() => callbacks.current.onError('YouTube 播放器無法使用，請重試或選擇其他歌曲。')}
        onStateChange={({ data: state, target }) => {
          if (state === 0) reportEnded(target);
          if (state === 1 && !latest.current.isPlaying) target.pauseVideo();
        }}
      />
    </div>
  );
});
export default SyncedPlayer;
