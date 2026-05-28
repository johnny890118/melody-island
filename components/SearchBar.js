'use client';

import React from 'react';
import { FaSearch } from 'react-icons/fa';

const SearchBar = ({ onChange, handleSearchSongs }) => {
  return (
    <div className="flex w-full rounded-lg border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-md">
      <input
        type="text"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSearchSongs();
          }
        }}
        placeholder="搜尋"
        className="flex-1 bg-transparent text-sm text-white placeholder:text-sm placeholder:text-white/40 focus:outline-none lg:text-base placeholder:lg:text-base"
      />
      <button
        onClick={handleSearchSongs}
        className="flex items-center text-[#dfe7dc] hover:text-[#f5d77a]"
      >
        <FaSearch />
      </button>
    </div>
  );
};

export default SearchBar;
