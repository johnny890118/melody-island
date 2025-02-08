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
    <div className="flex flex-col w-full gap-4 md:flex-row">
      <div className="w-full md:hidden">{topInfo}</div>
      <div className="pointer-events-none w-full aspect-video md:basis-1/2 border border-gray-800">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&mute=1`}
          frameborder="0"
          allow="autoplay; encrypted-media"
          allowfullscreen
        ></iframe>
      </div>
      <div className="flex w-full flex-col gap-4 md:basis-1/2 justify-between">
        <div className="w-full hidden md:block">{topInfo}</div>
        <div className="flex flex-col gap-1 lg:gap-2">
          <p className="text-white text-sm lg:text-2xl">現正播放：</p>
          <p className="text-white font-bold lg:text-3xl">{nowPlayingTitle}</p>
        </div>
        <button
          className="flex text-gray-900 bg-[#fff8e1] rounded-full p-2 justify-center items-center gap-2 hover:scale-105 active:scale-100 transition text-sm font-bold md:w-28 md:p-3 lg:w-32 lg:p-4 lg:text-base"
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
