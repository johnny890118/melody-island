'use client';

import { createContext, useContext, type ReactNode } from 'react';
import english from '@/lib/messages/en.json';
import { type Locale } from '@/lib/locales';

const englishMessages: Readonly<Record<string, string>> = english;
type Values = Readonly<Record<string, string | number>>;

function translate(locale: Locale, message: string, values?: Values): string {
  const copy = locale === 'en' && Object.hasOwn(englishMessages, message) ? englishMessages[message] : message;
  return values ? copy.replace(/\{(\w+)\}/g, (token, key: string) => String(values[key] ?? token)) : copy;
}

const translations = {
  'zh-Hant': (message: string, values?: Values) => translate('zh-Hant', message, values),
  en: (message: string, values?: Values) => translate('en', message, values),
};

const LocaleContext = createContext<Locale>('zh-Hant');

export function useLocale() {
  const locale = useContext(LocaleContext);
  return { locale, t: translations[locale] };
}

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
