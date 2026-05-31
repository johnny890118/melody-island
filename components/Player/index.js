'use client';

import React from 'react';
import YouTube from 'react-youtube';
import { FaPlay } from 'react-icons/fa';
import './player.scss';

const Player = ({
  videoId,
  onPlayerReady,
  onPlayerStateChange,
  isPlaying,
  topInfo,
  nowPlayingTitle,
  handlePlay,
}) => {
  return (
    <div className="glass-panel liquid-glass flex w-full flex-col gap-4 rounded-2xl p-3 md:flex-row lg:p-4">
      <div className="relative z-10 w-full md:hidden">{topInfo}</div>
      <div className="pointer-events-none relative z-10 aspect-video w-full overflow-hidden rounded-xl border border-white/15 bg-black/35 shadow-2xl shadow-black/25 md:basis-1/2">
        <YouTube
          className="w-full h-full player"
          videoId={videoId}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
          opts={{
            playerVars: {
              autoplay: isPlaying ? 1 : 0,
              showinfo: 0,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
            },
          }}
        />
      </div>
      <div className="relative z-10 flex w-full flex-col justify-between gap-5 md:basis-1/2">
        <div className="hidden w-full md:block">{topInfo}</div>
        <div className="flex flex-col gap-1 lg:gap-2">
          <p className="text-sm font-bold text-[#8df5ff] drop-shadow lg:text-xl">現正播放：</p>
          <p className="line-clamp-3 text-xl font-black text-[#fff8e1] drop-shadow lg:text-3xl">
            {nowPlayingTitle || '等待音樂登島'}
          </p>
        </div>
        <button
          className="glass-button-primary flex items-center justify-center gap-2 rounded-full p-3 text-sm font-bold md:w-32 lg:p-4 lg:text-base"
          onClick={handlePlay}
        >
          <FaPlay />
          播放
        </button>
      </div>
    </div>
  );
};

export default Player;
