'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { doc, onSnapshot, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/app/config/firebase';
import Player from '@/components/Player';
import Playlist from '@/components/Playlist';
import SearchArea from '@/components/SearchArea';
import PlayerControls from '@/components/PlayerControls';
import { LuCopy, LuCopyCheck } from 'react-icons/lu';
import { setIsLoading } from '@/store/islandSlice';

const DEFAULT_PERMISSIONS = {
  guestsCanControlPlayback: true,
  guestsCanEditQueue: true,
  guestsCanSkip: true,
};

const timestampToMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;

  return 0;
};

const getPlaybackUpdatedAtMs = (data) =>
  timestampToMillis(data?.playbackUpdatedAt) || Date.now();

const getExpectedPlaybackSeconds = (data) => {
  const positionMs = typeof data?.positionMs === 'number' ? data.positionMs : 0;

  if (!data?.isPlaying) return positionMs / 1000;

  return Math.max(0, (positionMs + Date.now() - getPlaybackUpdatedAtMs(data)) / 1000);
};

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
  const [isShuffle, setIsShuffle] = useState(false);
  const [optimisticSongs, setOptimisticSongs] = useState([]);
  const searchQuery = useRef('');
  const player = useRef({});
  const lastLoadedVideo = useRef('');
  const isOwner = islandOwner === authEmail;
  const permissions = { ...DEFAULT_PERMISSIONS, ...(islandData?.permissions || {}) };
  const canControlPlayback = isOwner || permissions.guestsCanControlPlayback;
  const canEditQueue = isOwner || permissions.guestsCanEditQueue;
  const canSkip = isOwner || permissions.guestsCanSkip || permissions.guestsCanControlPlayback;
  const playlist = useMemo(() => islandData?.playlist || [], [islandData?.playlist]);
  const visiblePlaylist = useMemo(() => {
    const savedVideoIds = new Set(playlist.map(({ videoId }) => videoId));
    const pendingSongs = optimisticSongs.filter(({ videoId }) => !savedVideoIds.has(videoId));

    return [...playlist, ...pendingSongs];
  }, [optimisticSongs, playlist]);
  const currentTrack = useMemo(
    () => visiblePlaylist.find(({ videoId }) => videoId === islandData?.currentVideo),
    [islandData?.currentVideo, visiblePlaylist],
  );

  const getIslandDocRef = () => doc(db, 'islands', islandId);

  const updatePlaybackState = async (payload) => {
    await updateDoc(getIslandDocRef(), {
      ...payload,
      playbackUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastChangedBy: authEmail || null,
    });
  };

  const syncPlayerToSession = useCallback(
    ({ forceLoad = false, seekThresholdSeconds = 2 } = {}) => {
      if (!isPlayerReady || !isIslandDataReady || !islandData.currentVideo) return;

      try {
        const expectedSeconds = getExpectedPlaybackSeconds(islandData);
        const playerCurrentTime = player.current.getCurrentTime?.() || 0;
        const isNewVideo = lastLoadedVideo.current !== islandData.currentVideo;

        if (forceLoad || isNewVideo) {
          player.current.loadVideoById(islandData.currentVideo, expectedSeconds);
          lastLoadedVideo.current = islandData.currentVideo;
          return;
        }

        if (Math.abs(playerCurrentTime - expectedSeconds) > seekThresholdSeconds) {
          player.current.seekTo(expectedSeconds, true);
        }
      } catch (e) {
        console.log('Error syncing player:', e);
      }
    },
    [isIslandDataReady, isPlayerReady, islandData],
  );

  const onPlayerReady = (event) => {
    if (typeof event.target !== 'object' || !Object.keys(event.target).length) return;

    player.current = event.target;

    setTimeout(() => {
      setIsPlayerReady(true);
    }, 2000);
  };

  const handleChangeSong = async (direction) => {
    if (!isIslandDataReady || !islandData?.playlist?.length) return;
    if (!canSkip) {
      alert('目前只有島主可以切歌');
      return;
    }

    const playlist = islandData.playlist;
    const currentVideo = islandData.currentVideo;
    const currentIndex = playlist.findIndex((item) => item.videoId === currentVideo);

    if (currentIndex === -1) return;

    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % playlist.length
        : (currentIndex - 1 + playlist.length) % playlist.length;

    const newVideo = playlist[nextIndex];

    await updatePlaybackState({
      currentVideo: newVideo.videoId,
      positionMs: 0,
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
    if (!canEditQueue) {
      alert('目前只有島主可以編輯播放清單');
      return;
    }

    if (
      playlist.some((item) => item.videoId === videoId) ||
      optimisticSongs.some((item) => item.videoId === videoId)
    ) {
      alert('該項目已在播放清單中');
      return;
    }

    const optimisticSong = {
      videoId,
      title,
      thumbnail,
      addedBy: authEmail || null,
      isPending: true,
    };

    setOptimisticSongs((prev) => [...prev, optimisticSong]);

    try {
      await runTransaction(db, async (transaction) => {
        const islandDocRef = getIslandDocRef();
        const islandSnap = await transaction.get(islandDocRef);
        const playlist = islandSnap.data()?.playlist || [];

        if (playlist.some((item) => item.videoId === videoId)) {
          throw new Error('DUPLICATE_SONG');
        }

        transaction.update(islandDocRef, {
          playlist: [...playlist, { videoId, title, thumbnail, addedBy: authEmail || null }],
          updatedAt: serverTimestamp(),
          lastChangedBy: authEmail || null,
        });
      });
    } catch (e) {
      if (e.message === 'DUPLICATE_SONG') {
        setOptimisticSongs((prev) => prev.filter((item) => item.videoId !== videoId));
        alert('該項目已在播放清單中');
        return;
      }

      console.log('add song error:', e);
      setOptimisticSongs((prev) => prev.filter((item) => item.videoId !== videoId));
    }
  };

  const handleRemoveSong = async (index) => {
    if (!isIslandDataReady) return;
    if (!canEditQueue) {
      alert('目前只有島主可以編輯播放清單');
      return;
    }

    const song = visiblePlaylist[index];
    if (song?.isPending) {
      setOptimisticSongs((prev) => prev.filter((item) => item.videoId !== song.videoId));
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const islandDocRef = getIslandDocRef();
        const islandSnap = await transaction.get(islandDocRef);
        const data = islandSnap.data();
        const playlist = data?.playlist || [];
        const currentVideo = data?.currentVideo || '';

        if (!playlist[index]) return;

        const isRemoveCurrentVideo = playlist[index].videoId === currentVideo;
        const newPlaylist = playlist.filter((_, i) => i !== index);
        const nextVideoId = newPlaylist.length
          ? newPlaylist[index]?.videoId || newPlaylist[0]?.videoId || ''
          : '';
        const payload = {
          playlist: newPlaylist,
          updatedAt: serverTimestamp(),
          lastChangedBy: authEmail || null,
        };

        if (isRemoveCurrentVideo) {
          payload.currentVideo = nextVideoId;
          payload.positionMs = 0;
          payload.isPlaying = Boolean(nextVideoId);
          payload.playbackUpdatedAt = serverTimestamp();
        }

        transaction.update(islandDocRef, payload);
      });
    } catch (e) {
      console.log('remove song error:', e);
    }
  };

  const playFromPlaylist = async (videoId) => {
    if (!isIslandDataReady || !isPlayerReady) return;
    if (!canControlPlayback) {
      alert('目前只有島主可以控制播放');
      return;
    }

    await updatePlaybackState({
      currentVideo: videoId,
      positionMs: 0,
      isPlaying: true,
    });
  };

  const handlePlayPause = async () => {
    if (!isIslandDataReady || !isPlayerReady) return;
    if (!canControlPlayback) {
      alert('目前只有島主可以控制播放');
      return;
    }

    const isPlaying = !islandData.isPlaying;
    const positionMs = Math.max(0, Math.round((player.current.getCurrentTime?.() || 0) * 1000));

    await updatePlaybackState({
      isPlaying,
      positionMs,
    });
  };

  const handlePlay = async () => {
    if (!isIslandDataReady || !isPlayerReady) return;
    if (!canControlPlayback) {
      alert('目前只有島主可以控制播放');
      return;
    }

    try {
      const currentVideo = islandData.currentVideo || islandData.playlist?.[0]?.videoId || '';
      if (!currentVideo) return;

      const isSameVideo = currentVideo === islandData.currentVideo;
      const positionMs = isSameVideo
        ? Math.max(0, Math.round((player.current.getCurrentTime?.() || 0) * 1000))
        : 0;

      await updatePlaybackState({
        currentVideo,
        isPlaying: true,
        positionMs,
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
          setIslandData(docSnap.data({ serverTimestamps: 'estimate' }));
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
    if (!playlist.length || !optimisticSongs.length) return;

    const savedVideoIds = new Set(playlist.map(({ videoId }) => videoId));
    setOptimisticSongs((prev) => prev.filter(({ videoId }) => !savedVideoIds.has(videoId)));
  }, [optimisticSongs.length, playlist]);

  useEffect(() => {
    if (!isPlayerReady || !isIslandDataReady || !islandData.currentVideo) return;

    syncPlayerToSession({
      forceLoad: lastLoadedVideo.current !== islandData.currentVideo,
      seekThresholdSeconds: 0.75,
    });
  }, [
    islandData.currentVideo,
    islandData.playbackUpdatedAt,
    isPlayerReady,
    isIslandDataReady,
    syncPlayerToSession,
  ]);

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
    if (!isPlayerReady || !isIslandDataReady || !islandData.isPlaying) return;

    const syncInterval = setInterval(() => {
      syncPlayerToSession({ seekThresholdSeconds: 2.5 });
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [
    islandData.currentVideo,
    islandData.isPlaying,
    islandData.playbackUpdatedAt,
    isPlayerReady,
    isIslandDataReady,
    syncPlayerToSession,
  ]);

  useEffect(() => {
    if (!isPlayerReady) {
      dispatch(setIsLoading(true));
    } else {
      dispatch(setIsLoading(false));
    }
  }, [dispatch, isPlayerReady]);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsMute(true);
    } else {
      setIsMute(false);
    }
  }, []);

  return (
    <div className="night-sky relative min-h-dvh overflow-hidden">
      <div className="star-dust pointer-events-none fixed inset-0 opacity-35" />
      <div className="aurora-ribbon pointer-events-none fixed -left-24 -right-24 top-12 h-96 opacity-70" />

      <main className="relative z-10 mx-auto mt-20 flex min-h-dvh w-full max-w-7xl flex-col justify-between gap-5 px-3 pb-32 pt-4 sm:mt-24 sm:gap-7 sm:px-6 lg:px-8">
        <Player
          videoId={islandData?.currentVideo || ''}
          onPlayerReady={onPlayerReady}
          onPlayerStateChange={onPlayerStateChange}
          isPlaying={islandData?.isPlaying || false}
          topInfo={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between md:flex-col md:items-start">
              <div className="glass-chip flex min-w-0 items-center gap-2 rounded-full px-3 py-2">
                <p className="islandInfoText truncate">島嶼ID：{islandId}</p>
                <button
                  className="shrink-0 text-[#fff8e1] transition hover:text-[#8df5ff]"
                  onClick={() => handleCopy(islandId)}
                >
                  {isCopied ? <LuCopyCheck /> : <LuCopy />}
                </button>
              </div>
              <p className="glass-chip islandInfoText min-w-0 truncate rounded-full px-3 py-2">
                島嶼名稱：{islandName}
              </p>
            </div>
          }
          nowPlayingTitle={currentTrack?.title || ''}
          handlePlay={handlePlay}
        />

        <div className="flex flex-col gap-5">
          <Playlist
            playlist={visiblePlaylist}
            currentVideo={islandData?.currentVideo || ''}
            playFromPlaylist={playFromPlaylist}
            handleRemoveSong={handleRemoveSong}
          />

          <SearchArea
            searchQueryOnChange={(value) => (searchQuery.current = value)}
            handleSearchSongs={handleSearchSongs}
            isLoading={isSearching}
            searchResults={searchResults}
            handleAddSong={handleAddSong}
          />
        </div>

        <PlayerControls
          thumbnail={currentTrack?.thumbnail || ''}
          title={currentTrack?.title || ''}
          handleChangeSong={handleChangeSong}
          handlePlayPause={handlePlayPause}
          isPlaying={islandData?.isPlaying || false}
          isMute={isMute}
          handleMute={() => setIsMute((prev) => !prev)}
          isShuffle={isShuffle}
          handleShuffle={() => setIsShuffle((prev) => !prev)}
        />
      </main>
    </div>
  );
};

export default IslandPage;
