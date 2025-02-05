'use client';

import React from 'react';
import { FaPause, FaPlay, FaStepBackward, FaStepForward } from 'react-icons/fa';

const PlayerControls = ({ thumbnail, title, handleChangeSong, handlePlayPause, isPlaying }) => {
  return (
    <div className="flex justify-between fixed bottom-0 left-0 right-0 z-50 bg-black/90 w-full p-2">
      {thumbnail && title ? (
        <div className="flex gap-2 items-center w-2/3 lg:w-1/3">
          <img src={thumbnail} alt={title} className="h-12 aspect-video" />
          <p className="text-white truncate flex-1 text-sm lg:text-base">{title}</p>
        </div>
      ) : (
        <div className="w-2/3 h-12" />
      )}
      <div className="flex justify-end gap-4 items-center w-1/3 lg:mr-0 lg:justify-center">
        <button
          onClick={() => handleChangeSong('prev')}
          className="text-gray-300 hover:text-white font-bold rounded-full"
        >
          <FaStepBackward />
        </button>
        <button
          onClick={handlePlayPause}
          className="text-gray-300 hover:text-white font-bold md:border md:border-gray-300 md:hover:border-white md:rounded-full md:p-3"
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <button
          onClick={() => handleChangeSong('next')}
          className="text-gray-300 hover:text-white font-bold rounded-full"
        >
          <FaStepForward />
        </button>
      </div>
      <div className="hidden lg:block w-1/3"></div>
    </div>
  );
};

export default PlayerControls;
