'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/app/config/firebase';
import Player from '@/components/Player';
import Playlist from '@/components/Playlist';
import SearchArea from '@/components/SearchArea';
import PlayerControls from '@/components/PlayerControls';

const IslandPage = () => {
  const { islandId, islandName, islandOwner } = useSelector((state) => state.island);
  const authEmail = useSelector((state) => state.auth?.user?.email) || '';
  const [islandData, setIslandData] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isIslandDataReady, setIsIslandDataReady] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const searchQuery = useRef('');
  const player = useRef({});
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
      } catch (e) {
        console.log('Error updating pause:', e);
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
    if (!searchQuery.current) return;

    setIsSearching(true);
    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
          searchQuery.current,
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
    } catch (e) {
      console.log('search songs error:', e);
    } finally {
      setIsSearching(false);
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

    await updateDoc(doc(db, 'islands', islandId), {
      isPlaying: false,
    });

    if (islandData.currentVideo === videoId && player.current) {
      player.current.loadVideoById(videoId, 0);
    }

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
      await updateDoc(doc(db, 'islands', islandId), {
        isPlaying: false,
      });

      player.current.loadVideoById(islandData.currentVideo, 0);

      const startTime = new Date().getTime();

      await updateDoc(doc(db, 'islands', islandId), {
        isPlaying: true,
        startTime,
      });
    } catch (e) {
      console.log('Error updating play:', e);
    }
  };

  const searchQueryOnChange = (value) => {
    searchQuery.current = value;
  };

  return (
    <div className="flex flex-col justify-between mt-20 gap-16 mx-40 min-h-dvh">
      <Player
        videoId={islandData?.currentVideo || ''}
        onPlayerReady={onPlayerReady}
        onPlayerStateChange={onPlayerStateChange}
        isPlaying={islandData?.isPlaying || false}
        topInfo={
          <div className="flex flex-col gap-2">
            <p className="font-bold text-[#fff8e1]">島嶼ID：{islandId}</p>
            <p className="font-bold text-[#fff8e1]">島嶼名稱：{islandName}</p>
          </div>
        }
        nowPlayingTitle={
          islandData?.playlist?.find(({ videoId }) => videoId === islandData?.currentVideo)
            ?.title || ''
        }
        handlePlay={handlePlay}
      />

      <Playlist
        playlist={islandData?.playlist || []}
        currentVideo={islandData?.currentVideo || ''}
        playFromPlaylist={playFromPlaylist}
        handleRemoveSong={handleRemoveSong}
      />

      <SearchArea
        searchQueryOnChange={searchQueryOnChange}
        handleSearchSongs={handleSearchSongs}
        isSearching={isSearching}
        searchResults={searchResults}
        handleAddSong={handleAddSong}
      />

      <PlayerControls
        thumbnail={
          islandData?.playlist?.find(({ videoId }) => videoId === islandData?.currentVideo)
            ?.thumbnail || ''
        }
        title={
          islandData?.playlist?.find(({ videoId }) => videoId === islandData?.currentVideo)
            ?.title || ''
        }
        changeSong={changeSong}
        handlePlayPause={handlePlayPause}
        isPlaying={islandData?.isPlaying || false}
      />
    </div>
  );
};

export default IslandPage;
