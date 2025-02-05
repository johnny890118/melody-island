'use client';

import React from 'react';
import { FaPlay, FaRegTrashAlt } from 'react-icons/fa';

const PlaylistItem = ({
  videoId,
  thumbnail,
  title,
  currentVideo,
  playFromPlaylist,
  handleRemoveSong,
  currentItemIndex,
}) => {
  return (
    <div key={videoId} className="flex items-center rounded-lg p-2 hover:bg-gray-800 group">
      <img src={thumbnail} alt={title} className="aspect-video w-16 md:w-20 rounded-md mr-4" />
      {videoId === currentVideo && <FaPlay className="text-[#fff8e1] mr-2" />}
      <div
        className="flex-1 font-bold text-white cursor-pointer truncate text-sm lg:text-base"
        onClick={() => playFromPlaylist(videoId)}
      >
        {title}
      </div>
      <button
        onClick={() => handleRemoveSong(currentItemIndex)}
        className="text-gray-400 hover:text-white px-2 group-hover:block lg:hidden"
      >
        <FaRegTrashAlt />
      </button>
    </div>
  );
};

export default PlaylistItem;
