'use client';

import React from 'react';
import SearchResultItem from './SearchResultItem';
import SearchBar from './SearchBar';

const SearchArea = ({
  searchQueryOnChange,
  handleSearchSongs,
  isLoading,
  searchResults,
  handleAddSong,
}) => {
  return (
    <div className="flex flex-col gap-2 mb-20">
      <p className="font-bold text-[#fff8e1] px-2 lg:text-2xl"># 為你的播放清單找些內容</p>
      <div className="h-[1px] bg-gray-700 px-2"></div>
      <div className="max-w-96 mt-2">
        <SearchBar onChange={searchQueryOnChange} handleSearchSongs={handleSearchSongs} />
      </div>
      {isLoading ? (
        <div className="text-center text-white">Loading...</div>
      ) : (
        <>
          {searchResults.map(({ videoId, thumbnail, title }) => (
            <SearchResultItem
              key={videoId}
              videoId={videoId}
              thumbnail={thumbnail}
              title={title}
              handleAddSong={handleAddSong}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default SearchArea;
