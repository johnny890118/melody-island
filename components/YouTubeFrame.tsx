'use client';

import { useEffect, useRef } from 'react';
import type { PlayerTarget } from '@/lib/types';

interface PlayerEvents {
  onReady(event: { target: PlayerTarget }): void;
  onStateChange(event: { target: PlayerTarget; data: number }): void;
  onError(event?: { data?: number }): void;
  onAutoplayBlocked(): void;
}

type PlayerConstructor = new (
  node: HTMLElement,
  options: {
    width: string;
    height: string;
    playerVars: { playsinline: number; rel: number; origin: string; controls: number; disablekb: number; fs: number };
    events: PlayerEvents;
  },
) => PlayerTarget & { destroy(): void };

declare global {
  interface Window {
    YT?: { Player?: PlayerConstructor };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<PlayerConstructor> | undefined;

function loadPlayer() {
  if (window.YT?.Player) return Promise.resolve(window.YT.Player);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const previous = window.onYouTubeIframeAPIReady;
    const finish = () => {
      window.clearTimeout(timeout);
      if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = previous;
    };
    const fail = () => {
      finish();
      script.remove();
      loading = undefined;
      reject(new Error('YouTube IFrame API unavailable'));
    };
    const ready = () => {
      if (!window.YT?.Player) return fail();
      finish();
      resolve(window.YT.Player);
      previous?.();
    };
    const timeout = window.setTimeout(fail, 12000);
    window.onYouTubeIframeAPIReady = ready;
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  });
  return loading;
}

export default function YouTubeFrame(props: PlayerEvents) {
  const host = useRef<HTMLDivElement>(null);
  const events = useRef(props);
  events.current = props;

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let cancelled = false;
    let player: InstanceType<PlayerConstructor> | undefined;
    // Promise continuation runs after the Strict Mode setup/cleanup probe.
    void loadPlayer()
      .then((Player) => {
        if (cancelled) return;
        const mount = document.createElement('div');
        container.append(mount);
        player = new Player(mount, {
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0, origin: window.location.origin, controls: 0, disablekb: 1, fs: 0 },
          events: {
            onReady: (event) => {
              if (!cancelled) events.current.onReady(event);
            },
            onStateChange: (event) => {
              if (!cancelled) events.current.onStateChange(event);
            },
            onError: (event) => {
              if (!cancelled) events.current.onError({ data: typeof event?.data === 'number' ? event.data : undefined });
            },
            onAutoplayBlocked: () => {
              if (!cancelled) events.current.onAutoplayBlocked();
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) events.current.onError();
      });

    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        // An already detached iframe cannot be recovered during teardown.
      } finally {
        container.replaceChildren();
      }
    };
  }, []);

  return <div ref={host} />;
}
