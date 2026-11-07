import type { MetadataRoute } from 'next';
import { locales, localizedPath } from '@/lib/locales';
import { siteOrigin } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin;
  if (!origin) return [];
  return ['/', '/about'].flatMap(path => locales.map(locale => ({
    url: new URL(localizedPath(locale, path), origin).href,
  })));
}
