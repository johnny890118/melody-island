import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import StoreProvider from '@/app/StoreProvider';
import { isLocale, locales } from '@/lib/locales';
import { preview } from '@/lib/seo';

export const metadata = {
  title: 'Melody Island',
  icons: '/brand-icon.svg',
  ...(preview ? { robots: { index: false, follow: false } } : {}),
};

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export default async function LocaleLayout({ children, params }: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale}>
      <body><StoreProvider locale={locale}>{children}</StoreProvider></body>
    </html>
  );
}
