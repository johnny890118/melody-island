'use client';

import React from 'react';
import PlaylistItem from './PlaylistItem';

const Playlist = ({ playlist, currentVideo, playFromPlaylist, handleRemoveSong }) => {
  return (
    <div className="glass-panel-soft liquid-glass flex flex-col gap-3 rounded-2xl p-3 sm:p-4">
      <div className="relative z-10 flex items-center justify-between gap-3">
        <p className="section-title"># 播放清單</p>
        <span className="rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-xs font-bold text-[#dfe7dc]">
          {playlist.length} 首
        </span>
      </div>
      <div className="section-divider relative z-10"></div>
      {playlist.length > 0 ? (
        <div className="relative z-10 flex flex-col gap-2">
          {playlist.map(({ videoId, title, thumbnail, isPending }, index) => (
            <PlaylistItem
              key={videoId}
              videoId={videoId}
              title={title}
              thumbnail={thumbnail}
              isPending={isPending}
              currentVideo={currentVideo}
              playFromPlaylist={playFromPlaylist}
              handleRemoveSong={handleRemoveSong}
              currentItemIndex={index}
            />
          ))}
        </div>
      ) : (
        <p className="relative z-10 rounded-xl border border-white/10 bg-white/[0.05] p-4 text-sm text-[#dfe7dc]">
          幫你的播放清單加入項目吧！
        </p>
      )}
    </div>
  );
};

export default Playlist;
