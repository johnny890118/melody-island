'use client';
import { useLocale } from '@/components/LocaleProvider';
import { isLocale, localizedPath } from '@/lib/locales';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchUser, logout, startGoogleLogin } from '@/store/authSlice';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AudioLines, ArrowUpRight, ChevronDown, Languages, LogOut } from 'lucide-react';

export default function Navbar() {
  const { t, locale } = useLocale();
  const languageLabel = locale === 'en' ? 'English' : '繁體中文';
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = pathname.replace(/^\/(en|zh-Hant)(?=\/|$)/, '') || '/';
  const { user, status } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [languageReady, setLanguageReady] = useState(false);
  useEffect(() => setLanguageReady(true), []);
  useEffect(() => {
    void dispatch(fetchUser()).then((result) => {
      if (fetchUser.rejected.match(result))
        setError(result.payload?.message || t('登入狀態無法讀取，請重新整理後再試。'));
    });
  }, [dispatch, t]);
  const login = async () => {
    if (status === 'loading') return;
    setPending(true);
    setError('');
    try {
      const result = await dispatch(startGoogleLogin());
      if (startGoogleLogin.rejected.match(result) && !result.meta.condition)
        setError(result.payload ?? t('登入暫時無法使用，請稍後再試。'));
    } finally {
      setPending(false);
    }
  };
  return (
    <header className="site-header">
      <Link href={localizedPath(locale, '/')} className="wordmark" aria-label={t('Melody Island 首頁')}>
        <AudioLines size={25} strokeWidth={1.6} />
        <span lang="en">
          Melody <span className="wordmark-island">Island</span>
        </span>
      </Link>
      <nav aria-label={t('主要導覽')} className="site-nav">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" className="locale-picker" aria-label={`${t('語言')} · ${languageLabel}`} disabled={!languageReady}>
              <Languages size={16} aria-hidden="true" />
              <span className="locale-picker-label" lang={locale}>{languageLabel}</span>
              <ChevronDown size={12} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" collisionPadding={12} className="locale-menu" aria-label={t('語言')}>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(nextLocale) => {
                if (isLocale(nextLocale) && nextLocale !== locale)
                  router.push(localizedPath(nextLocale, currentPath) + window.location.search + window.location.hash);
              }}
            >
              <DropdownMenuRadioItem value="zh-Hant" lang="zh-Hant">繁體中文</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en" lang="en">English</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {user && !user.isAnonymous ? (
          <Button
            variant="ghost"
            className="nav-action"
            disabled={status === 'loading'}
            onClick={() => dispatch(logout())}
          >
            {t('登出')} <LogOut size={15} aria-hidden="true" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="nav-action"
            disabled={pending || status === 'loading'}
            onClick={login}
          >
            {pending ? t('正在前往登入…') : t('登入')}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Button>
        )}
      </nav>
      {error && (
        <p className="nav-error" role="alert">
          {t(error)}
        </p>
      )}
    </header>
  );
}
