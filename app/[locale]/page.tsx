import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/locales';
import { publicMetadata } from '@/lib/seo';
import Home from './Home';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return publicMetadata(locale, '/');
}

export default Home;
