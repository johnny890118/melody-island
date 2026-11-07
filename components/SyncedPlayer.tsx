'use client';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import YouTubeFrame from './YouTubeFrame';
import type { Playback, PlayerHandle, PlayerTarget, Room } from '@/lib/types';
import { RadioPlayer, type MediaObservation, type RadioAction, type RadioTrigger } from '@/lib/radio-player';
interface SyncedPlayerProps {
  session: Playback & Partial<Room>;
  clockOffset?: number;
  clock?: { now(): number; uncertaintyMs: number };
  durationMs?: number;
  canRelay?: boolean;
  onAdvance(session: Playback & Partial<Room>): void | Promise<boolean>;
  onError(message: string): void;
  onReady(): void;
  onBlocked(): void;
  onPlaying?(): void;
}
export interface SyncDiagnostics { phase: string; counts: Partial<Record<RadioAction['type'], number>>; trace: ReturnType<RadioPlayer['diagnostics']>['trace'] }
declare global { interface Window { __melodySyncDiagnostics?: SyncDiagnostics } }
function observe(target: PlayerTarget, fallbackVideo: string): MediaObservation {
  let videoId = '';
  try { videoId = new URL(target.getVideoUrl?.() ?? '').searchParams.get('v') ?? ''; } catch { /* Await real provider metadata. */ }
  try {
    return { state: target.getPlayerState?.() ?? -1, seconds: target.getCurrentTime(), duration: target.getDuration?.() ?? 0,
      videoId: target.getVideoUrl ? videoId : fallbackVideo };
  } catch { return { state: -1, seconds: NaN, duration: NaN, videoId: '' }; }
}
const SyncedPlayer = forwardRef<PlayerHandle, SyncedPlayerProps>(function SyncedPlayer(props, ref) {
  const { t } = useLocale();
  const latest = useRef(props); latest.current = props;
  const player = useRef<PlayerTarget | null>(null);
  const policy = useRef(new RadioPlayer());
  const active = useRef(true);
  const executing = useRef(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const testPlayer = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' && process.env.NEXT_PUBLIC_TEST_PLAYER === 'true';
  const run = useCallback((trigger: RadioTrigger) => {
    const target = player.current;
    if (executing.current) return;
    executing.current = true;
    try {
      const props = latest.current;
      const controller = policy.current;
      const previousPhase = controller.phase;
      const actions = controller.decide({ ...props.session, durationMs: props.durationMs },
        target ? observe(target, props.session.currentVideo) : { state: -1, seconds: 0, duration: 0, videoId: '' }, props.clock?.now() ?? Date.now() + (props.clockOffset ?? 0),
        performance.now(), props.clock?.uncertaintyMs ?? 0, trigger, props.canRelay ?? true, target !== null);
      for (const action of actions) {
        switch (action.type) {
          case 'load': target?.loadVideoById(action.videoId, action.seconds); break;
          case 'cue': target?.cueVideoById(action.videoId, action.seconds); break;
          case 'seek': target?.seekTo(action.seconds, true); break;
          case 'play': target?.playVideo(); break;
          case 'pause': target?.pauseVideo(); break;
          case 'stop': target?.stopVideo(); break;
          case 'blocked': props.onBlocked(); break;
          case 'complete':
            void Promise.resolve(props.onAdvance(action.authority)).then(accepted => {
              if (active.current && controller === policy.current)
                controller.completionResult(action.key, accepted === true, performance.now());
            }).catch(() => {
              if (active.current && controller === policy.current)
                controller.completionResult(action.key, false, performance.now());
            });
        }
      }
      if (controller.phase === 'playing' && previousPhase !== 'playing') props.onPlaying?.();
      if (new URLSearchParams(window.location.search).get('syncDebug') === '1')
        window.__melodySyncDiagnostics = controller.diagnostics();
    } catch {
      latest.current.onError('播放器暫時無法同步，請點選重新同步。');
    } finally { executing.current = false; }
  }, []);
  useImperativeHandle(ref, () => ({
    sync: () => run('resync'),
    toggleMute: () => setMuted(value => !value),
    enableAudio: () => {
      try { player.current?.unMute(); setMuted(false); run('activate'); }
      catch { latest.current.onError('無法啟用聲音，請再按一次「開始聆聽」。'); }
    },
  }), [run]);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; player.current = null; };
  }, []);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => latest.current.onError('連接 YouTube 逾時，請重試播放器或確認網路。'), 15000);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => { run('snapshot'); }, [ready, props.session, props.durationMs, props.clockOffset, props.canRelay, run]);
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) run('tick'); }, 1000);
    const reconnect = () => { if (!document.hidden) run('reconnect'); };
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', reconnect);
    return () => { clearInterval(timer); window.removeEventListener('online', reconnect); document.removeEventListener('visibilitychange', reconnect); };
  }, [run]);
  useEffect(() => {
    if (ready) { if (muted) player.current?.mute(); else player.current?.unMute(); }
  }, [ready, muted]);
  useEffect(() => {
    if (!testPlayer) return;
    let seconds = 0; let at = performance.now(); let playing = false; let videoId = '';
    const time = () => seconds + (playing ? (performance.now() - at) / 1000 : 0);
    player.current = {
      loadVideoById: (id, value) => { videoId = id; seconds = value; at = performance.now(); playing = true; },
      cueVideoById: (id, value) => { videoId = id; seconds = value; at = performance.now(); playing = false; },
      getCurrentTime: time,
      getPlayerState: () => playing ? 1 : 2,
      getVideoUrl: () => `https://www.youtube.com/watch?v=${videoId}`,
      getDuration: () => 60,
      seekTo: value => { seconds = value; at = performance.now(); },
      playVideo: () => { seconds = time(); at = performance.now(); playing = true; },
      pauseVideo: () => { seconds = time(); at = performance.now(); playing = false; },
      stopVideo: () => { playing = false; videoId = ''; }, mute() {}, unMute() {},
    };
    setReady(true); latest.current.onReady();
    return () => { player.current = null; };
  }, [testPlayer]);
  if (testPlayer) return <div className="video-frame" data-testid="test-player" data-video={props.session.currentVideo} data-playing={props.session.isPlaying}><div className="test-player-label">{t('模擬播放器 · E2E 測試資料')}</div></div>;
  return <div className="video-frame" aria-busy={!ready}><YouTubeFrame
    onReady={({ target }) => {
      if (player.current && player.current !== target) policy.current = new RadioPlayer();
      player.current = target; setReady(true); latest.current.onReady(); run('snapshot');
    }}
    onAutoplayBlocked={() => { policy.current.block(performance.now()); latest.current.onBlocked(); }}
    onError={(event) => {
      const code = Number.isFinite(event?.data) ? event?.data ?? 0 : 0;
      policy.current.providerError(code, performance.now());
      latest.current.onError(t('YouTube 播放器無法使用{code}，請按重試播放器或選擇其他歌曲。', { code: code ? ` (${code})` : '' }));
    }}
    onStateChange={({ target }) => {
      if (target !== player.current) return;
      run('state');
    }}
  /></div>;
});
export default SyncedPlayer;
