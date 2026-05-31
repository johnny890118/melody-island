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
    <div className="glass-panel-soft liquid-glass mb-2 flex flex-col gap-3 rounded-2xl p-3 sm:p-4">
      <div className="relative z-10">
        <p className="section-title"># 為你的播放清單找些內容</p>
      </div>
      <div className="section-divider relative z-10"></div>
      <div className="relative z-10 mt-1 w-full">
        <SearchBar onChange={searchQueryOnChange} handleSearchSongs={handleSearchSongs} />
      </div>
      {isLoading ? (
        <div className="relative z-10 flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-5 text-center text-[#dfe7dc]">
          <div className="loading-orb h-8 w-8 shadow-[0_0_22px_rgba(141,245,255,0.32)]" />
          <span className="text-sm font-bold">正在搜尋夜空中的音樂...</span>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col gap-2">
          {searchResults.map(({ videoId, thumbnail, title }) => (
            <SearchResultItem
              key={videoId}
              videoId={videoId}
              thumbnail={thumbnail}
              title={title}
              handleAddSong={handleAddSong}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchArea;
