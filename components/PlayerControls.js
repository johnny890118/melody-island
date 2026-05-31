'use client';

import React from 'react';
import Image from 'next/image';
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
  isShuffle,
  handleShuffle,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex min-h-20 w-full items-center justify-center border-t border-white/15 bg-[#03050c]/60 px-3 py-3 shadow-[0_-18px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:px-4">
      {thumbnail && title ? (
        <div className="hidden w-2/3 min-w-0 items-center gap-3 sm:flex lg:w-1/3">
          <Image
            src={thumbnail}
            alt={title}
            width={100}
            height={56}
            className="aspect-video h-14 w-auto rounded-xl border border-white/15 object-cover shadow-lg shadow-black/25"
          />
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#fff8e1] lg:text-base">
            {title}
          </p>
        </div>
      ) : (
        <div className="hidden h-14 w-2/3" />
      )}
      <div className="liquid-glass flex w-full max-w-md items-center justify-center gap-1.5 rounded-full border border-white/15 px-2 py-2 sm:w-1/3 sm:min-w-[320px] sm:gap-2 lg:mr-0 lg:justify-center">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-base text-[#dfe7dc] transition hover:bg-white/10 hover:text-[#8df5ff] sm:text-lg"
          onClick={handleShuffle}
        >
          {isShuffle ? <FaShuffle /> : <FaRightLeft />}
        </button>
        <button
          onClick={() => handleChangeSong('prev')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-base text-[#dfe7dc] transition hover:bg-white/10 hover:text-[#8df5ff] sm:text-lg"
        >
          <FaBackwardStep />
        </button>
        <button
          onClick={handlePlayPause}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[#8df5ff]/40 bg-[#8df5ff]/15 text-lg text-[#fff8e1] shadow-[0_0_28px_rgba(141,245,255,0.25)] transition hover:border-[#8df5ff]/80 hover:bg-[#8df5ff]/25 hover:text-[#8df5ff]"
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <button
          onClick={() => handleChangeSong('next')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-base text-[#dfe7dc] transition hover:bg-white/10 hover:text-[#8df5ff] sm:text-lg"
        >
          <FaForwardStep />
        </button>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-base text-[#dfe7dc] transition hover:bg-white/10 hover:text-[#8df5ff] sm:text-lg"
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
