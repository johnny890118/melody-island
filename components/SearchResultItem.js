'use client';

import React from 'react';
import Image from 'next/image';
import { MdAdd } from 'react-icons/md';

const SearchResultItem = ({ videoId, thumbnail, title, handleAddSong }) => {
  return (
    <div className="flex items-center rounded-lg border border-transparent p-2 transition hover:border-white/10 hover:bg-white/[0.07]">
      <Image
        src={thumbnail}
        alt={title}
        width={80}
        height={45}
        className="mr-4 aspect-video w-16 rounded-md object-cover md:w-20"
      />
      <p className="flex-1 truncate text-sm font-bold text-[#fff8e1] lg:text-base">{title}</p>
      <button
        onClick={() => handleAddSong(videoId, title, thumbnail)}
        className="px-2 text-white/50 hover:text-[#f5d77a]"
      >
        <MdAdd />
      </button>
    </div>
  );
};

export default SearchResultItem;
