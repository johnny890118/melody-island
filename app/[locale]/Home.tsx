'use client';
import { useLocale } from '@/components/LocaleProvider';
import { localizedPath } from '@/lib/locales';
import { Button } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';
import { preload } from 'react-dom';
import dynamic from 'next/dynamic';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { ArrowUpRight } from 'lucide-react';
import { db } from '@/app/config/firebase';
import { api } from '@/lib/api';
import { startGoogleLogin } from '@/store/authSlice';
import CustomDialog, { type FormValues } from '@/components/CustomDialog';
import type { CreateRoomInput, RoomResponse } from '@/lib/types';
function SceneLoading() {
  const { t } = useLocale();
  return <div className="island-stage scene-fallback">{t('正在準備島嶼…')}</div>;
}

const Hero = dynamic(() => import('@/components/Hero'), {
  ssr: false,
  loading: SceneLoading,
});

export default function HomePage() {
  const { t, locale } = useLocale();
  preload('/models/island.glb', { as: 'fetch', crossOrigin: 'anonymous' });
  const dispatch = useAppDispatch();
  const { user, ready, status } = useAppSelector((state) => state.auth);
  const [ownIsland, setOwnIsland] = useState('');
  const [notice, setNotice] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const loginToCreate = async () => {
    if (loggingIn || status === 'loading') return;
    setLoggingIn(true);
    setNotice('');
    try {
      const result = await dispatch(startGoogleLogin());
      if (startGoogleLogin.rejected.match(result) && !result.meta.condition)
        setNotice(result.payload ?? t('登入暫時無法使用，請稍後再試。'));
    } finally {
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
          if (!cancelled) setNotice(t('目前無法查詢你的島嶼，仍可使用 ID 加入。'));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [ready, user?.uid, user?.isAnonymous, t]);
  const create = async (values: FormValues) => {
    const result = await api<RoomResponse>('/api/islands', {
      islandName: values.islandName || '',
      islandPassword: values.islandPassword || '',
    } satisfies CreateRoomInput);
    router.push(localizedPath(locale, `/island/${result.id}`));
  };
  const join = async (values: FormValues) => {
    const id = values.islandId?.trim();
    if (!/^[A-Za-z0-9_-]{10}$/.test(id || '')) throw new Error(t('請輸入完整的 10 碼島嶼 ID。'));
    const result = await api<RoomResponse>(`/api/islands/${id}/join`, {
      islandPassword: values.islandPassword,
    });
    router.push(localizedPath(locale, `/island/${result.id}`));
  };
  return (
    <main className="home-page" id="main-content">
      <div className="moon-atmosphere" aria-hidden="true">
        <div className="moon-disc" />
      </div>
      <div className="home-composition">
        <Hero />
        <div className="hero-title">
          <h1 lang="en">
            Melody
            <br />
            <em>Island</em>
          </h1>
          <p>{t('不同的地方，同一首歌。')}</p>
        </div>
        <div className="home-actions" aria-label={t('開始共聽')}>
          <div className="home-action-list">
            <CustomDialog
              title={t('朋友在島上等你')}
              description={t('輸入朋友分享的島嶼 ID 與密碼。無須 Google 帳號也能加入。')}
              inputs={[
                { label: 'islandId', placeholder: t('島嶼 ID'), maxLength: 10 },
                { label: 'islandPassword', placeholder: t('島嶼密碼'), type: 'password' },
              ]}
              onConfirm={join}
              triggerLabel={t('加入島嶼')}
              confirmLabel={t('一起登島')}
            />
            {!user || user.isAnonymous ? (
              <Button
                variant="ghost"
                className="action-button"
                disabled={!ready || loggingIn || status === 'loading'}
                onClick={loginToCreate}
              >
                {loggingIn ? t('正在登入…') : t('開闢島嶼')}
                <ArrowUpRight size={18} />
              </Button>
            ) : ownIsland ? (
              <Button
                variant="ghost"
                className="action-button"
                onClick={() => router.push(localizedPath(locale, `/island/${ownIsland}`))}
              >
                {t('我的島嶼')}
                <ArrowUpRight size={18} />
              </Button>
            ) : (
              <CustomDialog
                title={t('開闢你的島嶼')}
                description={t('取個名字，設定密碼，再邀請朋友一起聽。')}
                inputs={[
                  { label: 'islandName', placeholder: t('島嶼名稱'), maxLength: 40 },
                  {
                    label: 'islandPassword',
                    placeholder: t('島嶼密碼（至少 8 字）'),
                    type: 'password',
                    minLength: 8,
                  },
                ]}
                onConfirm={create}
                triggerLabel={t('開闢島嶼')}
                confirmLabel={t('開闢島嶼')}
                disabled={!ready || !user || user.isAnonymous}
              />
            )}

          </div>
          <Link className="home-about-link" href={localizedPath(locale, '/about')}>
            {locale === 'en' ? 'How it works' : '共聽指南'}
          </Link>
        </div>
        {notice && (
          <p className="home-caption quiet-notice" role="status">
            {t(notice)}
          </p>
        )}
      </div>
    </main>
  );
}
