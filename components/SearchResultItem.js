'use client';

import React from 'react';
import Image from 'next/image';
import { MdAdd } from 'react-icons/md';

const SearchResultItem = ({ videoId, thumbnail, title, handleAddSong }) => {
  return (
    <div className="group flex items-center rounded-xl border border-white/10 bg-white/[0.045] p-2 transition duration-300 hover:-translate-y-0.5 hover:border-[#8df5ff]/40 hover:bg-white/[0.1]">
      <Image
        src={thumbnail}
        alt={title}
        width={80}
        height={45}
        className="mr-3 aspect-video w-16 rounded-lg object-cover shadow-lg shadow-black/20 md:mr-4 md:w-20"
      />
      <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#fff8e1] lg:text-base">{title}</p>
      <button
        onClick={() => handleAddSong(videoId, title, thumbnail)}
        className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/60 transition hover:bg-[#8df5ff]/15 hover:text-[#8df5ff] group-hover:text-[#fff8e1]"
      >
        <MdAdd />
      </button>
    </div>
  );
};

export default SearchResultItem;
