'use client';
import './globals.css';
import { Provider } from 'react-redux';
import { useRef, type ReactNode } from 'react';
import { makeStore, type AppStore } from '@/store/store';
import Navbar from '@/components/Navbar';
export default function StoreProvider({ children }: { children: ReactNode }) {
  const store = useRef<AppStore | null>(null);
  if (!store.current) store.current = makeStore();
  return (
    <Provider store={store.current}>
      <a href="#main-content" className="skip-link">
        跳至主要內容
      </a>
      <Navbar />
      {children}
    </Provider>
  );
}
