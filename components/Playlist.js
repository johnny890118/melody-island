'use client';

import React from 'react';
import PlaylistItem from './PlaylistItem';

const Playlist = ({ playlist, currentVideo, playFromPlaylist, handleRemoveSong }) => {
  return (
    <div className="glass-panel-soft flex flex-col gap-2 rounded-lg p-3">
      <p className="section-title"># 播放清單</p>
      <div className="section-divider"></div>
      {playlist.length > 0 ? (
        playlist.map(({ videoId, title, thumbnail }, index) => (
          <PlaylistItem
            key={videoId}
            videoId={videoId}
            title={title}
            thumbnail={thumbnail}
            currentVideo={currentVideo}
            playFromPlaylist={playFromPlaylist}
            handleRemoveSong={handleRemoveSong}
            currentItemIndex={index}
          />
        ))
      ) : (
        <p className="p-2 text-[#dfe7dc]">幫你的播放清單加入項目吧！</p>
      )}
    </div>
  );
};

export default Playlist;
