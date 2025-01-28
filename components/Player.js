import React from 'react';
import YouTube from 'react-youtube';
import { FaPlay } from 'react-icons/fa';

const Player = ({
  videoId,
  onPlayerReady,
  onPlayerStateChange,
  isPlaying,
  topInfo,
  nowPlayingTitle,
  handlePlay,
}) => {
  return (
    <div className="flex gap-8">
      <div className="flex pointer-events-none border border-gray-800">
        <YouTube
          videoId={videoId}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
          opts={{
            playerVars: {
              autoplay: isPlaying ? 1 : 0,
              showinfo: 0,
              rel: 0,
              modestbranding: 1,
            },
          }}
        />
      </div>
      <div className="flex flex-col justify-between">
        {topInfo}
        <div className="flex flex-col gap-2">
          <p className="text-white text-3xl">現正播放：</p>
          <p className="text-white text-3xl font-bold">{nowPlayingTitle}</p>
        </div>
        <button
          className="flex text-gray-900 bg-[#fff8e1] rounded-full p-4 w-32 justify-center items-center gap-2 hover:scale-105 transition"
          onClick={handlePlay}
        >
          <FaPlay />
          播放
        </button>
      </div>
    </div>
  );
};

export default Player;
