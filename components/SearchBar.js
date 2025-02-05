'use client';

import React from 'react';
import { FaSearch } from 'react-icons/fa';

const SearchBar = ({ onChange, handleSearchSongs }) => {
  return (
    <div className="flex bg-gray-700 rounded-md py-3 px-4 w-full">
      <input
        type="text"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSearchSongs();
          }
        }}
        placeholder="搜尋"
        className="flex-1 text-white placeholder-gray-400 focus:outline-none bg-transparent placeholder:text-sm placeholder:lg:text-base text-sm lg:text-base"
      />
      <button
        onClick={handleSearchSongs}
        className="flex items-center text-gray-200 hover:text-white"
      >
        <FaSearch />
      </button>
    </div>
  );
};

export default SearchBar;
