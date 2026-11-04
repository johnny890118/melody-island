'use client';
import { Button } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';
import { preload } from 'react-dom';
import dynamic from 'next/dynamic';
import { useAppSelector } from '@/store/hooks';
import { useRouter } from 'next/navigation';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { ArrowUpRight, Headphones } from 'lucide-react';
import { db } from './config/firebase';
import { api } from '@/lib/api';
import { startGoogleLogin } from '@/store/authSlice';
import CustomDialog, { type FormValues } from '@/components/CustomDialog';
import type { CreateRoomInput, RoomResponse } from '@/lib/types';
const Hero = dynamic(() => import('@/components/Hero'), {
  ssr: false,
  loading: () => <div className="island-stage scene-fallback">正在準備島嶼…</div>,
});

export default function HomePage() {
  preload('/models/island.glb', { as: 'fetch', crossOrigin: 'anonymous' });
  const { user, ready } = useAppSelector((state) => state.auth);
  const [ownIsland, setOwnIsland] = useState('');
  const [notice, setNotice] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const loginToCreate = async () => {
    if (loggingIn) return;
    setLoggingIn(true);
    setNotice('');
    try {
      await startGoogleLogin();
    } catch {
      setNotice('登入暫時無法使用，請稍後再試。');
      setLoggingIn(false);
    }
  };
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    setOwnIsland('');
    if (ready && user?.uid && !user.isAnonymous) {
      getDocs(query(collection(db, 'islands'), where('ownerUid', '==', user.uid), limit(1)))
        .then((snapshot) => {
          if (!cancelled && !snapshot.empty) setOwnIsland(snapshot.docs[0].id);
        })
        .catch(() => {
          if (!cancelled) setNotice('目前無法查詢你的島嶼，仍可使用 ID 加入。');
        });
    }
    return () => {
      cancelled = true;
    };
  }, [ready, user?.uid, user?.isAnonymous]);
  const create = async (values: FormValues) => {
    const result = await api<RoomResponse>('/api/islands', {
      islandName: values.islandName || '',
      islandPassword: values.islandPassword || '',
    } satisfies CreateRoomInput);
    router.push(`/island/${result.id}`);
  };
  const join = async (values: FormValues) => {
    const id = values.islandId?.trim();
    if (!/^[A-Za-z0-9_-]{10}$/.test(id || '')) throw new Error('請輸入完整的 10 碼島嶼 ID。');
    const result = await api<RoomResponse>(`/api/islands/${id}/join`, {
      islandPassword: values.islandPassword,
    });
    router.push(`/island/${result.id}`);
  };
  return (
    <main className="home-page" id="main-content">
      <div className="moon-atmosphere" aria-hidden="true">
        <div className="moon-disc" />
        <svg viewBox="0 0 1440 850" preserveAspectRatio="none" fill="none">
          <path d="M440 680 1280 380" stroke="#ffc991" strokeDasharray="2 9" opacity=".35" />
        </svg>
      </div>
      <div className="home-composition">
        <Hero />
        <div className="hero-title">
          <h1 lang="en">
            Melody
            <br />
            <em>Island</em>
          </h1>
          <p>邀朋友登島，一起聽喜歡的歌。</p>
        </div>
        <div className="home-actions">
          <div className="home-action-list">
            {!user || user.isAnonymous ? (
              <Button
                variant="ghost"
                className="action-button"
                disabled={!ready || loggingIn}
                onClick={loginToCreate}
              >
                {loggingIn ? '正在登入…' : '登入並建立島嶼'}
                <ArrowUpRight size={18} />
              </Button>
            ) : ownIsland ? (
              <Button
                variant="ghost"
                className="action-button"
                onClick={() => router.push(`/island/${ownIsland}`)}
              >
                回到我的島嶼
                <ArrowUpRight size={18} />
              </Button>
            ) : (
              <CustomDialog
                title="建立你的島嶼"
                description="取個名字，設定密碼，再邀請朋友一起聽。"
                inputs={[
                  { label: 'islandName', placeholder: '島嶼名稱', maxLength: 40 },
                  {
                    label: 'islandPassword',
                    placeholder: '島嶼密碼（至少 8 字）',
                    type: 'password',
                    minLength: 8,
                  },
                ]}
                onConfirm={create}
                triggerLabel={user && !user.isAnonymous ? '建立島嶼' : '登入後建立島嶼'}
                confirmLabel="建立島嶼"
                disabled={!ready || !user || user.isAnonymous}
              />
            )}
            <CustomDialog
              title="朋友在島上等你"
              description="輸入朋友分享的島嶼 ID 與密碼。無須 Google 帳號也能加入。"
              inputs={[
                { label: 'islandId', placeholder: '島嶼 ID', maxLength: 10 },
                { label: 'islandPassword', placeholder: '島嶼密碼', type: 'password' },
              ]}
              onConfirm={join}
              triggerLabel="加入朋友的島嶼"
              confirmLabel="一起登島"
            />
          </div>
        </div>
        <div className="home-caption">
          {notice ? (
            <p className="quiet-notice" role="status">
              {notice}
            </p>
          ) : (
            <>
              <Headphones size={16} />
              <span>不同的地方，同一首歌。</span>
            </>
          )}
        </div>
      </div>
      <footer className="home-footer">
        <span>Melody Island</span>
        <span>給旋律一個相遇的地方。</span>
        <a
          href="https://sketchfab.com/3d-models/foxs-islands-163b68e09fcc47618450150be7785907"
          target="_blank"
          rel="noreferrer"
        >
          島嶼：nimzu · CC BY 4.0 <ArrowUpRight size={12} />
        </a>
        <a
          href="https://sketchfab.com/3d-models/phoenix-bird-844ba0cf144a413ea92c779f18912042"
          target="_blank"
          rel="noreferrer"
        >
          鳳凰：NORBERTO-3D · CC BY 4.0 <ArrowUpRight size={12} />
        </a>
      </footer>
    </main>
  );
}
