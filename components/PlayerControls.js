'use client';

import React from 'react';
import {
  FaVolumeHigh,
  FaVolumeXmark,
  FaShuffle,
  FaRightLeft,
  FaPlay,
  FaPause,
  FaBackwardStep,
  FaForwardStep,
} from 'react-icons/fa6';

const PlayerControls = ({
  thumbnail,
  title,
  handleChangeSong,
  handlePlayPause,
  isPlaying,
  isMute,
  handleMute,
  isSuffle,
  handleShuffle,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex min-h-20 w-full justify-center border-t border-white/10 bg-[#05080d]/75 px-4 py-3 backdrop-blur-xl">
      {thumbnail && title ? (
        <div className="hidden w-2/3 items-center gap-3 sm:flex lg:w-1/3">
          <img src={thumbnail} alt={title} className="aspect-video h-14 rounded-md" />
          <p className="flex-1 truncate text-base text-[#fff8e1] lg:text-lg">{title}</p>
        </div>
      ) : (
        <div className="hidden h-14 w-2/3" />
      )}
      <div className="flex items-center justify-center gap-3 sm:w-1/3 sm:justify-end lg:mr-0 lg:justify-center">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-[#dfe7dc] transition hover:bg-white/10 hover:text-[#f5d77a]"
          onClick={handleShuffle}
        >
          {isSuffle ? <FaShuffle /> : <FaRightLeft />}
        </button>
        <button
          onClick={() => handleChangeSong('prev')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-[#dfe7dc] transition hover:bg-white/10 hover:text-[#f5d77a]"
        >
          <FaBackwardStep />
        </button>
        <button
          onClick={handlePlayPause}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg text-[#fff8e1] transition hover:border-[#f5d77a]/60 hover:bg-[#f5d77a]/10 hover:text-[#f5d77a]"
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <button
          onClick={() => handleChangeSong('next')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-[#dfe7dc] transition hover:bg-white/10 hover:text-[#f5d77a]"
        >
          <FaForwardStep />
        </button>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-[#dfe7dc] transition hover:bg-white/10 hover:text-[#f5d77a]"
          onClick={handleMute}
        >
          {isMute ? <FaVolumeXmark /> : <FaVolumeHigh />}
        </button>
      </div>
      <div className="hidden w-1/3 lg:block"></div>
    </div>
  );
};

export default PlayerControls;
