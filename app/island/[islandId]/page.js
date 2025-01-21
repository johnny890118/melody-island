'use client';

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { setPlaylist, setCurrentVideo } from '@/store/islandSlice';
import YouTube from 'react-youtube';
import { db } from '@/app/config/firebase';
import { FaSearch, FaPlay, FaTrash } from 'react-icons/fa';
import { IoMdAdd } from 'react-icons/io';

const IslandPage = () => {
  const { islandId, islandName, playlist, currentVideo, islandOwner } = useSelector(
    (state) => state.island,
  );
  const authEmail = useSelector((state) => state.auth?.user?.email) || '';
  const isOwner = islandOwner === authEmail;
  const dispatch = useDispatch();

  const [player, setPlayer] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasOwnerPlayed, setHasOwnerPlayed] = useState(false);

  useEffect(() => {
    if (!islandId) return;

    const unsubscribe = onSnapshot(doc(db, 'islands', islandId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        dispatch(setPlaylist(data.playlist));
        dispatch(setCurrentVideo({ video: data.currentVideo }));
      }
    });

    return () => unsubscribe();
  }, [islandId, dispatch]);

  const onPlayerReady = (event) => {
    setPlayer(event.target);

    if (currentVideo && hasOwnerPlayed) {
      event.target.loadVideoById(currentVideo);
      event.target.playVideo();
    }
  };

  const onPlayerStateChange = (event) => {
    if (!isOwner) return;

    const playerState = event.data;
    if (playerState === 0) {
      changeSong('next');
    }
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
    const currentPlaylist = Array.isArray(playlist) ? playlist : [];
    if (currentPlaylist.some((item) => item.videoId === videoId)) {
      alert('該項目已在播放清單中');
      return;
    }

    const newPlaylist = [...currentPlaylist, { videoId, title, thumbnail }];
    await updateDoc(doc(db, 'islands', islandId), {
      playlist: newPlaylist,
    });
    dispatch(setPlaylist(newPlaylist));
  };

  const handleRemoveSong = async (index) => {
    const isRemoveCurrentVideo = playlist[index].videoId === currentVideo;
    const newPlaylist = playlist.filter((_, i) => i !== index);
    const nextVideoId =
      newPlaylist.length > 0 ? newPlaylist[index]?.videoId || newPlaylist[0]?.videoId : '';

    if (isRemoveCurrentVideo) {
      dispatch(setCurrentVideo({ video: nextVideoId }));
    }

    await updateDoc(doc(db, 'islands', islandId), {
      currentVideo: nextVideoId,
      playlist: newPlaylist,
    });

    dispatch(setPlaylist(newPlaylist));
  };

  const changeSong = async (direction) => {
    if (!isOwner || !playlist.length) return;

    const currentIndex = playlist.findIndex((item) => item.videoId === currentVideo);
    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % playlist.length
        : (currentIndex - 1 + playlist.length) % playlist.length;

    const newVideo = playlist[nextIndex];
    await updateDoc(doc(db, 'islands', islandId), {
      currentVideo: newVideo.videoId,
    });
    dispatch(setCurrentVideo({ video: newVideo.videoId }));

    if (player) {
      player.loadVideoById(newVideo.videoId);
      player.playVideo();
    }
  };

  const playFromPlaylist = async (videoId) => {
    if (!isOwner) return;

    await updateDoc(doc(db, 'islands', islandId), {
      currentVideo: videoId,
    });
    dispatch(setCurrentVideo({ video: videoId }));

    setHasOwnerPlayed(true);

    if (player) {
      player.loadVideoById(videoId);
      player.playVideo();
    }
  };

  return (
    <div className="flex flex-col justify-between mt-20 gap-8 mx-40">
      <div className="flex justify-between items-center">
        <p className="font-bold text-[#fff8e1]">島嶼ID：{islandId}</p>
        <div className="flex bg-gray-700 rounded-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋音樂..."
            className="flex-1 px-8 py-3 text-white placeholder-gray-400 focus:outline-none bg-transparent"
          />
          <button
            onClick={handleSearchSongs}
            className="px-8 py-3 flex items-center text-gray-200 hover:text-white"
          >
            <FaSearch />
          </button>
        </div>
        <p className="font-bold text-[#fff8e1]">島嶼名稱：{islandName}</p>
      </div>

      {/* 搜尋結果 */}
      <section className="bg-gray-800 p-8 rounded-lg">
        <p className="text-3xl font-bold text-green-300">搜尋結果</p>
        {isLoading ? (
          <div className="text-center text-white">Loading...</div>
        ) : (
          <ul>
            {searchResults.map((result) => (
              <li
                key={result.videoId}
                className="flex items-center rounded-lg p-4 hover:bg-gray-700 transition"
              >
                <img
                  src={result.thumbnail}
                  alt={result.title}
                  className="w-20 h-12 rounded-md mr-4"
                />
                <div className="flex-1">
                  <p className="text-lg font-medium text-white truncate">{result.title}</p>
                </div>
                <button
                  onClick={() => handleAddSong(result.videoId, result.title, result.thumbnail)}
                  className="bg-gray-600 hover:bg-gray-500 text-white font-bold p-3 rounded-full"
                >
                  <IoMdAdd />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 播放清單 */}
      <section className="bg-gray-800 p-8 rounded-lg">
        <p className="text-3xl font-bold text-green-300">播放清單</p>
        <ul>
          {playlist.map((item, index) => (
            <li
              key={index}
              className="flex items-center rounded-lg p-4 hover:bg-gray-700 transition"
            >
              <img src={item.thumbnail} alt={item.title} className="w-20 h-12 rounded-md mr-4" />
              {item.videoId === currentVideo && <FaPlay className="text-[#fff8e1] mr-2" />}
              <div
                className="flex-1 text-lg font-medium text-white cursor-pointer truncate"
                onClick={() => playFromPlaylist(item.videoId)}
              >
                {item.title}
              </div>
              <button
                onClick={() => handleRemoveSong(index)}
                className="text-gray-400 hover:text-white p-3"
              >
                <FaTrash />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 播放器 */}
      {isOwner && currentVideo && (
        <div className="flex w-full mb-28 justify-center">
          <YouTube
            videoId={currentVideo}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            onPlay={() => setHasOwnerPlayed(true)}
            opts={{
              playerVars: {
                autoplay: hasOwnerPlayed && 1,
                showinfo: 0,
                rel: 0,
                modestbranding: 1,
              },
            }}
          />
        </div>
      )}
    </div>
  );
};

export default IslandPage;
