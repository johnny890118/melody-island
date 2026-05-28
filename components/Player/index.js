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
    <div className="glass-panel flex w-full flex-col gap-4 rounded-lg p-3 md:flex-row lg:p-4">
      <div className="w-full md:hidden">{topInfo}</div>
      <div className="pointer-events-none aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/30 md:basis-1/2">
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
      <div className="flex w-full flex-col justify-between gap-4 md:basis-1/2">
        <div className="w-full hidden md:block">{topInfo}</div>
        <div className="flex flex-col gap-1 lg:gap-2">
          <p className="text-sm text-[#dfe7dc] lg:text-2xl">現正播放：</p>
          <p className="font-bold text-[#fff8e1] lg:text-3xl">
            {nowPlayingTitle || '等待音樂登島'}
          </p>
        </div>
        <button
          className="glass-button-primary flex items-center justify-center gap-2 rounded-lg p-2 text-sm font-bold md:w-28 md:p-3 lg:w-32 lg:p-4 lg:text-base"
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
