'use client';

import React from 'react';
import { FaSearch } from 'react-icons/fa';

const SearchBar = ({ onChange, handleSearchSongs }) => {
  return (
    <div className="flex bg-gray-700 rounded-md w-80 my-2">
      <input
        type="text"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSearchSongs();
          }
        }}
        placeholder="搜尋"
        className="flex-1 px-8 py-3 text-white placeholder-gray-400 focus:outline-none bg-transparent"
      />
      <button
        onClick={handleSearchSongs}
        className="px-8 py-3 flex items-center text-gray-200 hover:text-white"
      >
        <FaSearch />
      </button>
    </div>
  );
};

export default SearchBar;
