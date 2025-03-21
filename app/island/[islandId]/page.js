'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/app/config/firebase';
import Player from '@/components/Player';
import Playlist from '@/components/Playlist';
import SearchArea from '@/components/SearchArea';
import PlayerControls from '@/components/PlayerControls';
import { LuCopy, LuCopyCheck } from 'react-icons/lu';
import { setIsLoading } from '@/store/islandSlice';

const IslandPage = () => {
  const { islandId, islandName, islandOwner } = useSelector((state) => state.island);
  const authEmail = useSelector((state) => state.auth?.user?.email) || '';
  const dispatch = useDispatch();
  const [islandData, setIslandData] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isIslandDataReady, setIsIslandDataReady] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMute, setIsMute] = useState(false);
  const [isSuffle, setIsSuffle] = useState(false);
  const searchQuery = useRef('');
  const player = useRef({});
  const isOwner = islandOwner === authEmail;

  const onPlayerReady = (event) => {
    if (typeof event.target !== 'object' || !Object.keys(event.target).length) return;

    player.current = event.target;
    player.current.mute();

    setTimeout(() => {
      setIsPlayerReady(true);
    }, 2000);
  };

  const handleChangeSong = async (direction) => {
    if (!isIslandDataReady || !islandData?.playlist?.length) return;

    const playlist = islandData.playlist;
    const currentVideo = islandData.currentVideo;
    const currentIndex = playlist.findIndex((item) => item.videoId === currentVideo);

    if (currentIndex === -1) return;

    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % playlist.length
        : (currentIndex - 1 + playlist.length) % playlist.length;

    const newVideo = playlist[nextIndex];

    await updateDoc(doc(db, 'islands', islandId), {
      currentVideo: newVideo.videoId,
      startTime: new Date().getTime(),
      isPlaying: true,
    });
  };

  const onPlayerStateChange = (event) => {
    if (!isOwner) return;

    const playerState = event.data;

    if (playerState === 0) {
      handleChangeSong('next');
    }
  };

  const handleSearchSongs = async () => {
    if (!searchQuery.current || !searchQuery.current.trim()) return;

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
      setSearchResults(
        data.items.map((item) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.default.url,
        })),
      );
    } catch (e) {
      console.log('search songs error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSong = async (videoId, title, thumbnail) => {
    if (!isIslandDataReady) return;

    const playlist = islandData.playlist || [];

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
      ? newPlaylist[index]?.videoId || newPlaylist[0]?.videoId || ''
      : '';

    if (isRemoveCurrentVideo) {
      await updateDoc(doc(db, 'islands', islandId), {
        currentVideo: nextVideoId,
        startTime: new Date().getTime(),
        playlist: newPlaylist,
      });
    } else {
      await updateDoc(doc(db, 'islands', islandId), {
        playlist: newPlaylist,
      });
    }
  };

  const playFromPlaylist = async (videoId) => {
    if (!isIslandDataReady || !isPlayerReady) return;

    await updateDoc(doc(db, 'islands', islandId), {
      currentVideo: videoId,
      startTime: new Date().getTime(),
      isPlaying: true,
    });
  };

  const handlePlayPause = async () => {
    if (!isIslandDataReady || !isPlayerReady) return;

    const isPlaying = !islandData.isPlaying;

    if (isPlaying) {
      const currentTime = player.current.getCurrentTime() || 0;
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
        isPlaying: true,
        startTime: new Date().getTime(),
      });
    } catch (e) {
      console.log('Error updating play:', e);
    }
  };

  const handleCopy = (textToCopy) => {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 1000);
      })
      .catch((error) => {
        console.error('Failed to copy text: ', error);
      });
  };

  useEffect(() => {
    if (!isPlayerReady || !isIslandDataReady) return;

    try {
      if (isMute) {
        player.current.mute();
      } else {
        player.current.unMute();
      }
    } catch (e) {
      console.log('Error mute/unmute video:', e);
    }
  }, [isMute, isPlayerReady, isIslandDataReady]);

  useEffect(() => {
    if (!islandId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'islands', islandId),
      (docSnap) => {
        if (docSnap.exists()) {
          setIslandData(docSnap.data());
        }
      },
      (e) => {
        console.log('Error fetching island data:', e);
        alert('目前無法取得您的島嶼資訊，請稍後再重新嘗試');
      },
    );

    return () => unsubscribe();
  }, [islandId]);

  useEffect(() => {
    if (Object.keys(islandData).length) {
      setIsIslandDataReady(true);
    } else {
      setIsIslandDataReady(false);
    }
  }, [islandData]);

  useEffect(() => {
    if (!isPlayerReady || !isIslandDataReady || !islandData.currentVideo) return;

    try {
      const elapsedTime = (new Date().getTime() - islandData.startTime) / 1000;
      player.current.loadVideoById(islandData.currentVideo, elapsedTime);
    } catch (e) {
      console.log('Error loading video:', e);
    }
  }, [islandData.currentVideo, islandData.startTime, isPlayerReady, isIslandDataReady]);

  useEffect(() => {
    if (!isPlayerReady || !isIslandDataReady) return;

    try {
      if (islandData.isPlaying) {
        player.current.playVideo();
      } else {
        player.current.pauseVideo();
      }
    } catch (e) {
      console.log('Error play/pause video:', e);
    }
  }, [islandData.isPlaying, isPlayerReady, isIslandDataReady]);

  useEffect(() => {
    if (!isPlayerReady) {
      dispatch(setIsLoading(true));
    } else {
      dispatch(setIsLoading(false));
    }
  }, [isPlayerReady]);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsMute(true);
    } else {
      setIsMute(false);
    }
  }, []);

  return (
    <div className="flex flex-col justify-between mt-20 gap-16 px-4 sm:px-6 min-h-dvh w-full lg:px-8 max-w-7xl mx-auto">
      <Player
        videoId={islandData?.currentVideo || ''}
        onPlayerReady={onPlayerReady}
        onPlayerStateChange={onPlayerStateChange}
        isPlaying={islandData?.isPlaying || false}
        topInfo={
          <div className="flex justify-between items-center md:items-start md:flex-col gap-2">
            <div className="flex gap-2 items-center">
              <p className="islandInfoText">島嶼ID：{islandId}</p>
              <button className="text-[#fff8e1]" onClick={() => handleCopy(islandId)}>
                {isCopied ? <LuCopyCheck /> : <LuCopy />}
              </button>
            </div>
            <p className="islandInfoText">島嶼名稱：{islandName}</p>
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
        searchQueryOnChange={(value) => (searchQuery.current = value)}
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
        handleChangeSong={handleChangeSong}
        handlePlayPause={handlePlayPause}
        isPlaying={islandData?.isPlaying || false}
        isMute={isMute}
        handleMute={() => setIsMute((prev) => !prev)}
        isSuffle={isSuffle}
        handleShuffle={() => setIsSuffle((prev) => !prev)}
      />
    </div>
  );
};

export default IslandPage;
