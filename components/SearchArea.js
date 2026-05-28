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
    <div className="glass-panel-soft mb-20 flex flex-col gap-2 rounded-lg p-3">
      <p className="section-title"># 為你的播放清單找些內容</p>
      <div className="section-divider"></div>
      <div className="mt-2 max-w-96">
        <SearchBar onChange={searchQueryOnChange} handleSearchSongs={handleSearchSongs} />
      </div>
      {isLoading ? (
        <div className="text-center text-[#dfe7dc]">Loading...</div>
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
