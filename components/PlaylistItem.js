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
      className={`group flex items-center rounded-xl border p-2 transition duration-300 hover:-translate-y-0.5 hover:border-[#8df5ff]/40 hover:bg-white/[0.1] ${
        videoId === currentVideo
          ? 'border-[#8df5ff]/45 bg-[#8df5ff]/10 shadow-[0_0_26px_rgba(141,245,255,0.14)]'
          : 'border-white/10 bg-white/[0.045]'
      } ${
        isPending ? 'opacity-60' : ''
      }`}
    >
      <Image
        src={thumbnail}
        alt={title}
        width={80}
        height={45}
        className="mr-3 aspect-video w-16 rounded-lg object-cover shadow-lg shadow-black/20 md:mr-4 md:w-20"
      />
      {videoId === currentVideo && <FaPlay className="mr-2 shrink-0 text-[#8df5ff]" />}
      <div
        className={`min-w-0 flex-1 truncate text-sm font-bold text-[#fff8e1] lg:text-base ${
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
        className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/55 transition hover:bg-[#ffb8d5]/15 hover:text-[#ffb8d5] lg:opacity-0 lg:group-hover:opacity-100"
      >
        <FaRegTrashAlt />
      </button>
    </div>
  );
};

export default PlaylistItem;
