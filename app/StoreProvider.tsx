'use client';
import './globals.css';
import { Provider } from 'react-redux';
import { useRef, type ReactNode } from 'react';
import { makeStore, type AppStore } from '@/store/store';
import Navbar from '@/components/Navbar';
import { LocaleProvider, useLocale } from '@/components/LocaleProvider';
import type { Locale } from '@/lib/locales';

function SkipLink() {
  const { t } = useLocale();
  return <a href="#main-content" className="skip-link">{t('跳至主要內容')}</a>;
}
export default function StoreProvider({ children, locale }: { children: ReactNode; locale: Locale }) {
  const store = useRef<AppStore | null>(null);
  if (!store.current) store.current = makeStore();
  return (
    <Provider store={store.current}>
      <LocaleProvider locale={locale}>
        <SkipLink />
        <Navbar />
        {children}
      </LocaleProvider>
    </Provider>
  );
}
