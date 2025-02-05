'use client';

import React from 'react';
import { MdAdd } from 'react-icons/md';

const SearchResultItem = ({ videoId, thumbnail, title, handleAddSong }) => {
  return (
    <div className="flex items-center rounded-lg p-2 hover:bg-gray-800 transition">
      <img src={thumbnail} alt={title} className="aspect-video w-16 md:w-20 rounded-md mr-4" />
      <p className="flex-1 font-bold text-white truncate text-sm lg:text-base">{title}</p>
      <button
        onClick={() => handleAddSong(videoId, title, thumbnail)}
        className="text-gray-400 hover:text-white px-2"
      >
        <MdAdd />
      </button>
    </div>
  );
};

export default SearchResultItem;
