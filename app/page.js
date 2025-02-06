'use client';

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { db } from './config/firebase';
import { nanoid } from 'nanoid';
import CustomDialog from '@/components/CustomDialog';
import { setIslandOwner, setIslandId, setIslandName, clearIsland } from '@/store/islandSlice';

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
      startTime: 0,
      isPlaying: false,
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
    };

    checkUserIsland();
  }, [user, router]);

  useEffect(() => {
    if (user) return;

    clearIsland();
  }, [user]);

  return (
    <div className="h-dvh flex flex-col justify-center items-center space-y-6 px-4 md:px-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#fff8e1] mb-6 text-center">
        歡迎來到 Melody Island
      </h1>

      {islandId ? (
        <button
          className="bg-gray-800 text-[#fff8e1] font-bold p-4 rounded-xl hover:bg-[#fff8e1] hover:text-gray-800 w-full sm:w-96 lg:active:scale-95 transition"
          onClick={() => router.push(`/island/${islandId}`)}
        >
          我的島嶼
        </button>
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
  );
};

export default HomePage;
