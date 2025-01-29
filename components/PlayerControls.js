'use client';

import React from 'react';
import { FaPause, FaPlay, FaStepBackward, FaStepForward } from 'react-icons/fa';

const PlayerControls = ({ thumbnail, title, handleChangeSong, handlePlayPause, isPlaying }) => {
  return (
    <div className="flex justify-between fixed bottom-0 left-0 right-0 z-50 bg-black/90">
      {thumbnail && title ? (
        <div className="flex flex-1 basis-1/3 gap-4 items-center">
          <img src={thumbnail} alt={title} className="h-16 rounded-md" />
          <p className="text-white">{title}</p>
        </div>
      ) : (
        <div className="flex-1 basis-1/3 h-16" />
      )}
      <div className="flex flex-1 basis-1/3 justify-center gap-4 items-center">
        <button
          onClick={() => handleChangeSong('prev')}
          className="p-3 text-gray-300 hover:text-white font-bold rounded-full"
        >
          <FaStepBackward />
        </button>
        <button
          onClick={handlePlayPause}
          className="p-3 text-gray-300 hover:text-white font-bold rounded-full border border-gray-300 hover:border-white"
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <button
          onClick={() => handleChangeSong('next')}
          className="p-3 text-gray-300 hover:text-white font-bold rounded-full"
        >
          <FaStepForward />
        </button>
      </div>
      <div className="flex-1 basis-1/3" />
    </div>
  );
};

export default PlayerControls;
