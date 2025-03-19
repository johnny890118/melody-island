'use client';

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { fetchUser, login, logout } from '@/store/authSlice';
import Link from 'next/link';
import { Button } from './ui/button';
import { Dancing_Script } from 'next/font/google';

const dancingScript = Dancing_Script({ subsets: ['latin'], weight: '700' });

const Navbar = () => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    dispatch(fetchUser());
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-5">
          <div className="flex items-center gap-2">
            <img src="/music-island-logo.png" alt="Melody Island Logo" className="w-8 h-8" />

            <Link
              href="/"
              className={`text-[#fff8e1] font-bold text-lg sm:text-2xl ${dancingScript.className}`}
            >
              Melody Island
            </Link>
          </div>

          <div>
            {!user ? (
              <Button
                onClick={() => dispatch(login())}
                className="flex items-center gap-2 bg-gray-800 text-[#fff8e1] font-bold px-4 py-2 rounded-md hover:bg-[#fff8e1] hover:text-gray-800 transition-transform transform active:scale-95 text-xs"
              >
                <img src="/google.png" alt="Google Logo" className="w-3 h-3" />
                登入
              </Button>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4">
                <img src={user.photoURL} alt="user photo" className="w-8 h-8 rounded-full" />
                <Button
                  onClick={() => dispatch(logout())}
                  className="bg-gray-800 text-[#fff8e1] font-bold px-4 py-2 rounded-md hover:bg-[#fff8e1] hover:text-gray-800 transition-transform transform active:scale-95 text-xs"
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
