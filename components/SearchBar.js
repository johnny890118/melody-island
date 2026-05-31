'use client';

import React from 'react';
import { FaSearch } from 'react-icons/fa';

const SearchBar = ({ onChange, handleSearchSongs }) => {
  return (
    <div className="flex w-full items-center gap-3 rounded-full border border-white/15 bg-white/[0.08] px-4 py-3 shadow-inner shadow-white/5 backdrop-blur-xl transition focus-within:border-[#8df5ff]/70 focus-within:bg-white/[0.12]">
      <input
        type="text"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSearchSongs();
          }
        }}
        placeholder="搜尋歌曲或歌手"
        className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-sm placeholder:text-white/45 focus:outline-none lg:text-base placeholder:lg:text-base"
      />
      <button
        onClick={handleSearchSongs}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8df5ff]/15 text-[#dfe7dc] transition hover:bg-[#8df5ff]/25 hover:text-[#8df5ff]"
      >
        <FaSearch />
      </button>
    </div>
  );
};

export default SearchBar;
