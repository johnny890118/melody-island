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
    <div className="flex justify-center fixed bottom-0 left-0 right-0 z-50 bg-black/90 w-full p-2 min-h-14">
      {thumbnail && title ? (
        <div className="hidden sm:flex gap-2 items-center w-2/3 lg:w-1/3">
          <img src={thumbnail} alt={title} className="h-12 aspect-video" />
          <p className="text-white truncate flex-1 text-sm lg:text-base">{title}</p>
        </div>
      ) : (
        <div className="hidden w-2/3 h-12" />
      )}
      <div className="flex justify-end gap-4 items-center sm:w-1/3 lg:mr-0 lg:justify-center">
        <button
          className="text-gray-300 hover:text-white font-bold rounded-full"
          onClick={handleShuffle}
        >
          {isSuffle ? <FaShuffle /> : <FaRightLeft />}
        </button>
        <button
          onClick={() => handleChangeSong('prev')}
          className="text-gray-300 hover:text-white font-bold rounded-full"
        >
          <FaBackwardStep />
        </button>
        <button
          onClick={handlePlayPause}
          className="text-gray-300 hover:text-white font-bold border border-gray-300 hover:border-white rounded-full p-3"
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <button
          onClick={() => handleChangeSong('next')}
          className="text-gray-300 hover:text-white font-bold rounded-full"
        >
          <FaForwardStep />
        </button>
        <button
          className="text-gray-300 hover:text-white font-bold rounded-full"
          onClick={handleMute}
        >
          {isMute ? <FaVolumeXmark /> : <FaVolumeHigh />}
        </button>
      </div>
      <div className="hidden lg:block w-1/3"></div>
    </div>
  );
};

export default PlayerControls;
