'use client';

import React from 'react';
import { IoMdAdd } from 'react-icons/io';

const SearchResultItem = ({ videoId, thumbnail, title, handleAddSong }) => {
  return (
    <div className="flex items-center rounded-lg p-2 hover:bg-gray-800 transition">
      <img src={thumbnail} alt={title} className="w-20 h-12 rounded-md mr-4" />
      <p className="flex-1 font-bold text-white truncate">{title}</p>
      <button
        onClick={() => handleAddSong(videoId, title, thumbnail)}
        className="text-gray-400 hover:text-white p-2 rounded-full border border-gray-400 hover:border-white"
      >
        <IoMdAdd />
      </button>
    </div>
  );
};

export default SearchResultItem;
