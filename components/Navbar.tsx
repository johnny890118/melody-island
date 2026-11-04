'use client';
import { Button } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchUser, logout, startGoogleLogin } from '@/store/authSlice';
import Link from 'next/link';
import { AudioLines, ArrowUpRight, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, status } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => {
    dispatch(fetchUser());
  }, [dispatch]);
  const login = async () => {
    setPending(true);
    setError('');
    try {
      await startGoogleLogin();
    } catch {
      setError('登入暫時無法使用，請稍後再試。');
      setPending(false);
    }
  };
  return (
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label="Melody Island 首頁">
        <AudioLines size={25} strokeWidth={1.6} />
        <span lang="en">
          Melody <span className="wordmark-island">Island</span>
        </span>
      </Link>
      <nav aria-label="主要導覽">
        {user && !user.isAnonymous ? (
          <Button
            variant="ghost"
            className="nav-action"
            disabled={status === 'loading'}
            onClick={() => dispatch(logout())}
          >
            登出 <LogOut size={15} aria-hidden="true" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="nav-action"
            disabled={pending || status === 'loading'}
            onClick={login}
          >
            {pending ? '正在登入…' : 'Google 登入'}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Button>
        )}
      </nav>
      {error && (
        <p className="nav-error" role="alert">
          {error}
        </p>
      )}
    </header>
  );
}
