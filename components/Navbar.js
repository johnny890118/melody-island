'use client';

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { fetchUser, logout, startGoogleLogin } from '@/store/authSlice';
import Link from 'next/link';
import { Button } from './ui/button';
import { Dancing_Script } from 'next/font/google';

const dancingScript = Dancing_Script({ subsets: ['latin'], weight: '700' });

const Navbar = () => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await startGoogleLogin();
    } catch (error) {
      console.error('Firebase login failed:', error);
      alert(`登入失敗：${error?.code || 'unknown'}\n${error?.message || ''}`);
    }
  };

  useEffect(() => {
    dispatch(fetchUser());
  }, [dispatch]);

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#05080d]/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <img src="/music-island-logo.png" alt="Melody Island Logo" className="w-8 h-8" />

            <Link
              href="/"
              className={`text-lg font-bold text-[#fff8e1] drop-shadow sm:text-2xl ${dancingScript.className}`}
            >
              Melody Island
            </Link>
          </div>

          <div>
            {!user ? (
              <Button
                type="button"
                onClick={handleLogin}
                className="glass-button flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold"
              >
                <img src="/google.png" alt="Google Logo" className="w-3 h-3" />
                登入
              </Button>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4">
                <img
                  src={user.photoURL}
                  alt="user photo"
                  className="h-8 w-8 rounded-full border border-white/20"
                />
                <Button
                  onClick={() => dispatch(logout())}
                  className="glass-button rounded-lg px-4 py-2 text-xs font-bold"
                >
                  登出
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
