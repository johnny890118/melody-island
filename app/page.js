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

      <div className="liquid-glass absolute left-1/2 top-24 z-30 w-[min(92vw,560px)] -translate-x-1/2 rounded-2xl border border-white/20 px-4 py-5 text-center shadow-xl shadow-black/25 backdrop-blur-2xl sm:px-6 sm:py-6 lg:top-28">
        <div className="relative z-10 space-y-2">
          <h1 className="text-2xl font-black tracking-normal text-[#8df5ff] drop-shadow-[0_0_18px_rgba(141,245,255,0.35)] sm:text-4xl">
            一起登島，聆聽共鳴
          </h1>
          <p className="mx-auto max-w-md text-sm leading-6 text-[#dfe7dc] sm:text-base">
            把音樂放進星空裡，和朋友一起在夜晚的島上同步播放。
          </p>
        </div>

        <div className="relative z-10 mt-5 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {islandId ? (
            <Button
              className="glass-button min-h-12 w-full rounded-lg border-[#8df5ff]/70 bg-[#8df5ff]/15 px-3 py-2.5 text-xs font-bold leading-tight shadow-[#8df5ff]/20 ring-1 ring-[#8df5ff]/35 hover:border-[#8df5ff] sm:text-sm"
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
