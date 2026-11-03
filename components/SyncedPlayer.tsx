'use client';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import YouTube from 'react-youtube';
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
          player.current?.playVideo();
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
    clockOffset,
    sync,
  ]);
  useEffect(() => {
    if (ready && session.isPlaying && player.current?.getPlayerState?.() === 0)
      callbacks.current.onEnded(session);
  }, [ready, session]);
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
      <YouTube
        opts={{ width: '100%', height: '100%', playerVars: { playsinline: 1, rel: 0 } }}
        onReady={(event) => {
          player.current = event.target as unknown as PlayerTarget;
          event.target.addEventListener?.('onAutoplayBlocked', () => callbacks.current.onBlocked());
          setReady(true);
          callbacks.current.onReady();
        }}
        onError={() => callbacks.current.onError('這首影片無法播放，請選擇其他歌曲。')}
        onStateChange={(event) => {
          const data = latest.current;
          if (event.data === 0 && loaded.current === data.currentVideo && data.isPlaying)
            callbacks.current.onEnded(data);
          // Loading a paused track must never turn it into a playing session.
          if (event.data === 1 && !data.isPlaying) event.target.pauseVideo();
        }}
      />
    </div>
  );
});
export default SyncedPlayer;
