'use client';

import React from 'react';
import Image from 'next/image';
import { FaPlay, FaRegTrashAlt } from 'react-icons/fa';

const PlaylistItem = ({
  videoId,
  thumbnail,
  title,
  isPending,
  currentVideo,
  playFromPlaylist,
  handleRemoveSong,
  currentItemIndex,
}) => {
  return (
    <div
      key={videoId}
      className={`group flex items-center rounded-lg border border-transparent p-2 transition hover:border-white/10 hover:bg-white/[0.07] ${
        isPending ? 'opacity-60' : ''
      }`}
    >
      <Image
        src={thumbnail}
        alt={title}
        width={80}
        height={45}
        className="mr-4 aspect-video w-16 rounded-md object-cover md:w-20"
      />
      {videoId === currentVideo && <FaPlay className="mr-2 text-[#f5d77a]" />}
      <div
        className={`flex-1 truncate text-sm font-bold text-[#fff8e1] lg:text-base ${
          isPending ? 'cursor-default' : 'cursor-pointer'
        }`}
        onClick={() => {
          if (!isPending) playFromPlaylist(videoId);
        }}
      >
        {title}
      </div>
      <button
        onClick={() => handleRemoveSong(currentItemIndex)}
        className="px-2 text-white/50 hover:text-[#f5d77a] group-hover:block lg:hidden"
      >
        <FaRegTrashAlt />
      </button>
    </div>
  );
};

export default PlaylistItem;
