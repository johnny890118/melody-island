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
  onPlaying?(): void;
}
import { expectedSeconds } from '@/lib/session';

const ALIGNMENT_TOLERANCE_SECONDS = 0.35;
const DRIFT_TOLERANCE_SECONDS = 1.5;
const CORRECTION_COOLDOWN_MS = 10000;

const SyncedPlayer = forwardRef<PlayerHandle, SyncedPlayerProps>(function SyncedPlayer(
  { session, clockOffset, onEnded, onError, onReady, onBlocked, onPlaying },
  ref,
) {
  const player = useRef<PlayerTarget | null>(null);
  const latest = useRef(session);
  latest.current = session;
  const callbacks = useRef({ onEnded, onError, onReady, onBlocked, onPlaying });
  callbacks.current = { onEnded, onError, onReady, onBlocked, onPlaying };
  const offset = useRef(clockOffset);
  offset.current = clockOffset;
  const loaded = useRef('');
  const timeline = useRef('');
  const lastSeekAt = useRef(-Infinity);
  const lastPlayAt = useRef(-Infinity);
  const stableSince = useRef<number | null>(null);
  const driftingSince = useRef<number | null>(null);
  const autoplayBlocked = useRef(false);
  const recoveringFromBuffer = useRef(false);
  const initialAlignment = useRef(false);
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
  const sync = useCallback((force = false, gesture = false) => {
    const target = player.current;
    const data = latest.current;
    if (!target) return;
    try {
      const now = Date.now();
      if (!data.currentVideo) {
        if (loaded.current) target.stopVideo();
        loaded.current = '';
        timeline.current = '';
        return;
      }
      const seconds = expectedSeconds(data, now + offset.current);
      const nextTimeline = `${data.currentVideo}:${data.isPlaying}:${data.positionMs}:${data.playbackUpdatedAt}`;
      const changed = timeline.current !== nextTimeline;
      if (loaded.current !== data.currentVideo) {
        loaded.current = data.currentVideo;
        timeline.current = nextTimeline;
        driftingSince.current = null;
        stableSince.current = null;
        lastSeekAt.current = -Infinity;
        lastPlayAt.current = now;
        initialAlignment.current = true;
        if (data.isPlaying && !autoplayBlocked.current)
          target.loadVideoById(data.currentVideo, seconds);
        else target.cueVideoById(data.currentVideo, seconds);
        return;
      }
      const state = target.getPlayerState?.();
      const drift = Math.abs((target.getCurrentTime() || 0) - seconds);
      timeline.current = nextTimeline;
      if (!data.isPlaying) {
        driftingSince.current = null;
        stableSince.current = null;
        if (state !== 2 && state !== 5) target.pauseVideo();
        if ((changed || (force && now - lastSeekAt.current >= 1000)) && drift > ALIGNMENT_TOLERANCE_SECONDS) {
          target.seekTo(seconds, true);
          initialAlignment.current = false;
          lastSeekAt.current = now;
        }
        return;
      }
      if (autoplayBlocked.current && !gesture) return;
      // An ended player waits for the authoritative track advance. Replaying it
      // locally can race the leader's lease handover and restart the old song.
      if (state === 0 && !changed && !gesture) return;
      // Seeking or replaying during buffering can restart loading indefinitely.
      // Only a user gesture may override this wait.
      if (state === 3 && !gesture) {
        recoveringFromBuffer.current = true;
        stableSince.current = null;
        driftingSince.current = null;
        return;
      }
      if (changed || force) {
        driftingSince.current = null;
        if (drift > ALIGNMENT_TOLERANCE_SECONDS && (changed || now - lastSeekAt.current >= 1000)) {
          target.seekTo(seconds, true);
          initialAlignment.current = false;
          lastSeekAt.current = now;
          stableSince.current = null;
        }
      } else if (state === 1) {
        stableSince.current ??= now;
        if (drift <= DRIFT_TOLERANCE_SECONDS) {
          driftingSince.current = null;
          recoveringFromBuffer.current = false;
        } else driftingSince.current ??= now;
        if (
          driftingSince.current !== null &&
          now - stableSince.current >= (recoveringFromBuffer.current ? 500 : 1500) &&
          now - driftingSince.current >= (recoveringFromBuffer.current ? 500 : 3000) &&
          now - lastSeekAt.current >= CORRECTION_COOLDOWN_MS
        ) {
          target.seekTo(seconds, true);
          initialAlignment.current = false;
          lastSeekAt.current = now;
          stableSince.current = null;
          driftingSince.current = null;
          recoveringFromBuffer.current = false;
        }
      }
      if (
        gesture ||
        (state !== 1 && state !== 3 && (force || changed || now - lastPlayAt.current >= CORRECTION_COOLDOWN_MS))
      ) {
        target.playVideo();
        lastPlayAt.current = now;
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
          autoplayBlocked.current = false;
          player.current?.unMute();
          sync(true, true);
          setMuted(false);
        } catch {
          callbacks.current.onError('無法啟用聲音，請再按一次「開始聆聽」。');
        }
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
    }, 1000);
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
        onAutoplayBlocked={() => {
          autoplayBlocked.current = true;
          callbacks.current.onBlocked();
        }}
        onError={() => callbacks.current.onError('YouTube 播放器無法使用，請重試或選擇其他歌曲。')}
        onStateChange={({ data: state, target }) => {
          if (target !== player.current) return;
          if (state === 0) reportEnded(target);
          if (state === 3) {
            recoveringFromBuffer.current = true;
            stableSince.current = null;
            driftingSince.current = null;
          }
          if (state === 1) {
            if (!latest.current.isPlaying) target.pauseVideo();
            else {
              autoplayBlocked.current = false;
              stableSince.current ??= Date.now();
              if (initialAlignment.current) {
                initialAlignment.current = false;
                if (Math.abs(target.getCurrentTime() - expectedSeconds(
                  latest.current, Date.now() + offset.current,
                )) > ALIGNMENT_TOLERANCE_SECONDS) sync(true);
              }
              if (
                recoveringFromBuffer.current &&
                Date.now() - lastSeekAt.current >= CORRECTION_COOLDOWN_MS &&
                Math.abs(target.getCurrentTime() - expectedSeconds(
                  latest.current, Date.now() + offset.current,
                )) > DRIFT_TOLERANCE_SECONDS
              ) {
                // One catch-up after decoding resumes, followed by the seek cooldown.
                sync(true);
              }
              callbacks.current.onPlaying?.();
            }
          }
        }}
      />
    </div>
  );
});
export default SyncedPlayer;
