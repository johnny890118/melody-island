'use client';

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config/firebase';
import { nanoid } from 'nanoid';
import CustomDialog from '@/components/CustomDialog';
import {
  setIslandOwner,
  setIslandId,
  setIslandName,
  clearIsland,
  setIsLoading,
} from '@/store/islandSlice';
import Hero from '@/components/Hero';
import { Button } from '@/components/ui/button';

const HomePage = () => {
  const { user } = useSelector((state) => state.auth);
  const { islandId } = useSelector((state) => state.island);
  const dispatch = useDispatch();
  const router = useRouter();

  const handleCreateIsland = async ({ islandName, islandPassword }) => {
    const newIslandId = nanoid(10);
    const islandData = {
      name: islandName,
      password: islandPassword,
      createdBy: user.email,
      id: newIslandId,
      playlist: [],
      currentVideo: '',
      positionMs: 0,
      isPlaying: false,
      playbackUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastChangedBy: user.email,
      permissions: {
        guestsCanControlPlayback: true,
        guestsCanEditQueue: true,
        guestsCanSkip: true,
      },
    };

    await setDoc(doc(db, 'islands', newIslandId), islandData);
    dispatch(setIslandOwner(user.email));
    dispatch(setIslandId(newIslandId));
    dispatch(setIslandName(islandName));
    router.push(`/island/${newIslandId}`);
  };

  const handleJoinIsland = async ({ islandId, islandPassword }) => {
    const islandDoc = await getDoc(doc(db, 'islands', islandId));
    if (!islandDoc.exists()) return alert('此島嶼不存在這世界上呢 😢');

    const islandData = islandDoc.data();
    if (islandData.password !== islandPassword) return alert('密碼錯誤');

    dispatch(setIslandOwner(islandData.createdBy));
    dispatch(setIslandId(islandData.id));
    dispatch(setIslandName(islandData.name));
    router.push(`/island/${islandId}`);
  };

  useEffect(() => {
    const checkUserIsland = async () => {
      dispatch(setIsLoading(true));
      if (user && user.email) {
        const islandsRef = collection(db, 'islands');
        const q = query(islandsRef, where('createdBy', '==', user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userIslandDoc = querySnapshot.docs[0];
          const userIslandId = userIslandDoc.id;
          const userIslandData = userIslandDoc.data();
          const userIslandName = userIslandData.name;
          const userIslandOwner = userIslandData.createdBy;

          dispatch(setIslandOwner(userIslandOwner));
          dispatch(setIslandId(userIslandId));
          dispatch(setIslandName(userIslandName));
        }
      } else {
        dispatch(setIslandOwner(''));
        dispatch(setIslandId(''));
        dispatch(setIslandName(''));
      }
      dispatch(setIsLoading(false));
    };

    checkUserIsland();
  }, [dispatch, user, router]);

  useEffect(() => {
    if (user) return;

    dispatch(clearIsland());
  }, [dispatch, user]);

  return (
    <div className="relative flex w-full flex-col items-center overflow-hidden">
      <Hero />

      <div className="absolute left-1/2 top-24 w-[min(92vw,520px)] -translate-x-1/2 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-4 shadow-xl shadow-black/20 backdrop-blur-md sm:px-5 lg:top-28">
        <div className="space-y-1.5 text-center">
          <h1 className="text-xl font-bold tracking-normal text-[#fff8e1] sm:text-2xl">
            一起登島，聆聽共鳴
          </h1>
          <p className="text-xs text-[#dfe7dc] sm:text-sm">在每一座島上，分享你們的音樂</p>
        </div>

        <div className="mt-4 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
          {islandId ? (
            <Button
              className="glass-button min-h-12 w-full rounded-lg border-[#f5d77a]/80 bg-[#f5d77a]/20 px-3 py-2.5 text-xs font-bold leading-tight shadow-[#f5d77a]/20 ring-1 ring-[#f5d77a]/45 hover:border-[#f5d77a] sm:text-sm"
              onClick={() => router.push(`/island/${islandId}`)}
            >
              我的島嶼
            </Button>
          ) : (
            <CustomDialog
              title="創建島嶼"
              description="輸入屬於您的島嶼名稱及密碼"
              inputs={[
                { label: 'islandName', placeholder: '島嶼名稱' },
                {
                  label: 'islandPassword',
                  placeholder: '密碼',
                  type: 'password',
                },
              ]}
              onConfirm={handleCreateIsland}
              triggerLabel={user && user.email ? '創建島嶼' : '創建島嶼 (需先登入)'}
              confirmLabel="創建"
              disabled={!(user && user.email)}
            />
          )}

          <CustomDialog
            title="加入島嶼"
            description="輸入島嶼 ID及密碼"
            inputs={[
              { label: 'islandId', placeholder: '島嶼 ID' },
              {
                label: 'islandPassword',
                placeholder: '密碼',
                type: 'password',
              },
            ]}
            onConfirm={handleJoinIsland}
            triggerLabel="加入島嶼"
            confirmLabel="加入"
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
