'use client';

import React from 'react';
import PlaylistItem from './PlaylistItem';

const Playlist = ({ playlist, currentVideo, playFromPlaylist, handleRemoveSong }) => {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-bold text-[#fff8e1] px-2 text-2xl">播放清單</p>
      <div className="h-[1px] bg-gray-700 px-2"></div>
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
        <p className="text-white p-2">幫你的播放清單加入項目吧！</p>
      )}
    </div>
  );
};

export default Playlist;
