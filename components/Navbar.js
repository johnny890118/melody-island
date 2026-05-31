'use client';

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { fetchUser, logout, startGoogleLogin } from '@/store/authSlice';
import Link from 'next/link';
import Image from 'next/image';
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
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/15 bg-[#03050c]/55 shadow-lg shadow-black/10 backdrop-blur-2xl">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-white/20 bg-white/10 p-1 shadow-[0_0_26px_rgba(141,245,255,0.18)] backdrop-blur-xl">
              <Image src="/music-island-logo.png" alt="Melody Island Logo" width={32} height={32} />
            </div>

            <Link
              href="/"
              className={`text-xl font-bold text-[#fff8e1] drop-shadow sm:text-3xl ${dancingScript.className}`}
            >
              Melody Island
            </Link>
          </div>

          <div>
            {!user ? (
              <Button
                type="button"
                onClick={handleLogin}
                className="glass-button flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold sm:px-5"
              >
                <Image src="/google.png" alt="Google Logo" width={12} height={12} />
                登入
              </Button>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4">
                <Image
                  src={user.photoURL}
                  alt="user photo"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full border border-white/30 shadow-[0_0_20px_rgba(141,245,255,0.22)]"
                />
                <Button
                  onClick={() => dispatch(logout())}
                  className="glass-button rounded-full px-4 py-2 text-xs font-bold sm:px-5"
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
