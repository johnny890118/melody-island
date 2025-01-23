'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import YouTube from 'react-youtube';
import { db } from '@/app/config/firebase';
import { FaSearch, FaPlay, FaTrash, FaStepBackward, FaPause, FaStepForward } from 'react-icons/fa';
import { IoMdAdd } from 'react-icons/io';

const IslandPage = () => {
  const { islandId, islandName, islandOwner } = useSelector((state) => state.island);
  const authEmail = useSelector((state) => state.auth?.user?.email) || '';
  const [islandData, setIslandData] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIslandDataReady, setIsIslandDataReady] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const player = useRef(null);
  const isOwner = islandOwner === authEmail;

  useEffect(() => {
    if (!islandId) return;

    const unsubscribe = onSnapshot(doc(db, 'islands', islandId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIslandData(data);
      }
    });

    return () => unsubscribe();
  }, [islandId]);

  useEffect(() => {
    if (Object.keys(islandData).length) {
      setIsIslandDataReady(true);
    }
  }, [islandData]);

  useEffect(() => {
    if (!isPlayerReady || !islandData?.currentVideo) return;

    try {
      player.current.loadVideoById(islandData.currentVideo);
    } catch (e) {
      console.log('Error loading video:', e);
    }
  }, [isPlayerReady, islandData.currentVideo]);

  useEffect(() => {
    if (!isPlayerReady || !isIslandDataReady) return;

    try {
      if (islandData.isPlaying) {
        player.current.playVideo();
      } else {
        player.current.pauseVideo();
      }
    } catch (e) {
      console.log('Error play pause video:', e);
    }
  }, [islandData.isPlaying, isPlayerReady, isIslandDataReady]);

  useEffect(() => {
    if (!isOwner) return;

    const updateIslandPause = async () => {
      try {
        await updateDoc(doc(db, 'islands', islandId), {
          isPlaying: false,
        });
      } catch (error) {
        console.error('Error updating pause:', error);
      }
    };

    updateIslandPause();
  }, [isOwner]);

  const onPlayerReady = (event) => {
    if (!event.target) return;

    player.current = event.target;
    setIsPlayerReady(true);

    const currentVideo = islandData.currentVideo;
    if (currentVideo) {
      const elapsedTime = (new Date().getTime() - islandData.startTime) / 1000;
      event.target.loadVideoById(currentVideo, elapsedTime);
      if (!islandData.isPlaying || isOwner) {
        event.target.pauseVideo();
      }
    }
  };

  const onPlayerStateChange = (event) => {
    if (!isOwner) return;

    const playerState = event.data;
    if (playerState === 0) {
      changeSong('next');
    } else if (playerState === 1) {
      updatePlayState(true);
    } else if (playerState === 2) {
      updatePlayState(false);
    }
  };

  const updatePlayState = async (isPlaying) => {
    if (!islandData.currentVideo || !isOwner) return;

    const currentTime = player.current.getCurrentTime();
    const newStartTime = new Date().getTime() - currentTime * 1000;

    await updateDoc(doc(db, 'islands', islandId), {
      isPlaying,
      startTime: newStartTime,
    });
  };

  const handleSearchSongs = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
          searchQuery,
        )}&key=${API_KEY}&maxResults=5`,
      );

      if (!response.ok) throw new Error('搜尋失敗，請稍後再試');

      const data = await response.json();
      const results = data.items.map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.default.url,
      }));
      setSearchResults(results);
    } catch (err) {
      console.log(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSong = async (videoId, title, thumbnail) => {
    if (!isIslandDataReady) return;

    const playlist = islandData.playlist;

    if (playlist.some((item) => item.videoId === videoId)) {
      alert('該項目已在播放清單中');
      return;
    }

    const newPlaylist = [...playlist, { videoId, title, thumbnail }];
    await updateDoc(doc(db, 'islands', islandId), {
      playlist: newPlaylist,
    });
  };

  const handleRemoveSong = async (index) => {
    if (!isIslandDataReady) return;

    const playlist = islandData.playlist;
    const currentVideo = islandData.currentVideo;

    const isRemoveCurrentVideo = playlist[index].videoId === currentVideo;
    const newPlaylist = playlist.filter((_, i) => i !== index);
    const nextVideoId = newPlaylist.length
      ? newPlaylist[index]?.videoId || newPlaylist[0]?.videoId
      : '';

    if (isRemoveCurrentVideo) {
      await updateDoc(doc(db, 'islands', islandId), {
        currentVideo: nextVideoId,
        playlist: newPlaylist,
      });
    } else {
      await updateDoc(doc(db, 'islands', islandId), {
        playlist: newPlaylist,
      });
    }
  };

  const changeSong = async (direction) => {
    if (!isIslandDataReady || !islandData.playlist.length) return;

    const playlist = islandData.playlist;
    const currentVideo = islandData.currentVideo;

    const currentIndex = playlist.findIndex((item) => item.videoId === currentVideo);
    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % playlist.length
        : (currentIndex - 1 + playlist.length) % playlist.length;

    const newVideo = playlist[nextIndex];
    const startTime = new Date().getTime();
    await updateDoc(doc(db, 'islands', islandId), {
      currentVideo: newVideo.videoId,
      startTime,
      isPlaying: true,
    });
  };

  const playFromPlaylist = async (videoId) => {
    if (!isIslandDataReady) return;

    const startTime = new Date().getTime();
    await updateDoc(doc(db, 'islands', islandId), {
      currentVideo: videoId,
      startTime,
      isPlaying: true,
    });
  };

  const handlePlayPause = async () => {
    if (!isIslandDataReady || !isPlayerReady) return;

    const isPlaying = !islandData.isPlaying;

    if (isPlaying) {
      const currentTime = player.current.getCurrentTime();
      const newStartTime = new Date().getTime() - currentTime * 1000;

      await updateDoc(doc(db, 'islands', islandId), {
        isPlaying,
        startTime: newStartTime,
      });
    } else {
      await updateDoc(doc(db, 'islands', islandId), {
        isPlaying,
      });
    }
  };

  const handlePlay = async () => {
    if (!isIslandDataReady || !isPlayerReady) return;

    try {
      const currentTime = player.current.getCurrentTime();
      const newStartTime = new Date().getTime() - currentTime * 1000;

      await updateDoc(doc(db, 'islands', islandId), {
        isPlaying: true,
        startTime: newStartTime,
      });
    } catch (error) {
      console.error('Error updating pause:', error);
    }
  };

  return (
    <div className="flex flex-col justify-between mt-20 gap-16 mx-40 min-h-dvh">
      <div className="flex gap-8">
        <div className="flex pointer-events-none">
          <YouTube
            videoId={islandData.currentVideo}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            opts={{
              playerVars: {
                autoplay: islandData.isPlaying ? 1 : 0,
                showinfo: 0,
                rel: 0,
                modestbranding: 1,
              },
            }}
          />
        </div>
        <div className="flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <p className="font-bold text-[#fff8e1]">島嶼ID：{islandId}</p>
            <p className="font-bold text-[#fff8e1]">島嶼名稱：{islandName}</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-white text-3xl">現正播放：</p>
            {islandData?.playlist?.map(
              ({ videoId, title }) =>
                videoId === islandData?.currentVideo && (
                  <p className="text-white text-3xl font-bold" key={videoId}>
                    {title}
                  </p>
                ),
            )}
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

      <div className="flex flex-col gap-2">
        <p className="font-bold text-[#fff8e1] px-2 text-2xl">播放清單</p>
        <div className="h-[1px] bg-gray-700 px-2"></div>
        {islandData?.playlist && islandData.playlist.length > 0 ? (
          islandData.playlist.map(({ videoId, title, thumbnail }, index) => (
            <div key={videoId} className="flex items-center rounded-lg p-2 hover:bg-gray-800 group">
              <img src={thumbnail} alt={title} className="w-20 h-12 rounded-md mr-4" />
              {videoId === islandData.currentVideo && <FaPlay className="text-[#fff8e1] mr-2" />}
              <div
                className="flex-1 font-bold text-white cursor-pointer truncate"
                onClick={() => playFromPlaylist(videoId)}
              >
                {title}
              </div>
              <button
                onClick={() => handleRemoveSong(index)}
                className="text-gray-400 hover:text-white p-3 group-hover:block hidden transition"
              >
                <FaTrash />
              </button>
            </div>
          ))
        ) : (
          <p className="text-white p-2">幫你的播放清單加入項目吧！</p>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-20">
        <p className="font-bold text-[#fff8e1] px-2 text-2xl">為你的播放清單找些內容</p>
        <div className="h-[1px] bg-gray-700 px-2"></div>
        <div className="flex bg-gray-700 rounded-md w-80 my-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
        {isLoading ? (
          <div className="text-center text-white">Loading...</div>
        ) : (
          <>
            {searchResults.map((result) => (
              <div
                key={result.videoId}
                className="flex items-center rounded-lg p-2 hover:bg-gray-700 transition"
              >
                <img
                  src={result.thumbnail}
                  alt={result.title}
                  className="w-20 h-12 rounded-md mr-4"
                />
                <p className="flex-1 font-bold text-white truncate">{result.title}</p>
                <button
                  onClick={() => handleAddSong(result.videoId, result.title, result.thumbnail)}
                  className="text-gray-400 hover:text-white p-2 rounded-full border border-gray-400 hover:border-white"
                >
                  <IoMdAdd />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="flex justify-between fixed bottom-0 left-0 right-0 z-50 bg-black/90">
        {islandData?.playlist?.map(
          ({ videoId, thumbnail, title }) =>
            videoId === islandData?.currentVideo && (
              <div key={videoId} className="flex flex-1 basis-1/3 gap-4 items-center">
                <img src={thumbnail} alt={title} className="h-16 rounded-md" />
                <p className="text-white">{title}</p>
              </div>
            ),
        )}
        <div className="flex flex-1 basis-1/3 justify-center gap-4 items-center">
          <button
            onClick={() => changeSong('prev')}
            className="p-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-full"
          >
            <FaStepBackward />
          </button>
          <button
            onClick={handlePlayPause}
            className="p-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-full"
          >
            {islandData?.isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <button
            onClick={() => changeSong('next')}
            className="p-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-full"
          >
            <FaStepForward />
          </button>
        </div>
        <div className="flex-1 basis-1/3" />
      </div>
    </div>
  );
};

export default IslandPage;
