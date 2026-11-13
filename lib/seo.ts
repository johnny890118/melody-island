import type { Metadata } from 'next';
import { localizedPath, type Locale } from './locales';

export const preview = process.env.VERCEL_ENV === 'preview' ||
  process.env.VERCEL_TARGET_ENV === 'staging' ||
  process.env.MELODY_DEPLOYMENT === 'staging' ||
  process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

export const siteOrigin = !preview && process.env.APP_ORIGIN
  ? new URL(process.env.APP_ORIGIN)
  : undefined;

export const siteName = 'Melody Island';

export const descriptions: Record<Locale, string> = {
  'zh-Hant': '和朋友建立私人島嶼，分享 YouTube 歌單並同步聆聽。訪客可用島嶼 ID 和密碼加入。',
  en: 'Create a private island, share a YouTube queue, and listen in sync with friends. Guests join with an island ID and password.',
};

export function publicMetadata(locale: Locale, path: string, title = siteName): Metadata {
  const description = descriptions[locale];
  const canonical = localizedPath(locale, path);
  return {
    title,
    description,
    icons: '/brand-icon.svg',
    ...(preview ? { robots: { index: false, follow: false } } : {}),
    ...(siteOrigin ? {
      metadataBase: siteOrigin,
      alternates: {
        canonical,
        languages: {
          'zh-Hant': localizedPath('zh-Hant', path),
          en: localizedPath('en', path),
          'x-default': localizedPath('zh-Hant', path),
        },
      },
      openGraph: { title, description, siteName, url: canonical, locale: locale === 'en' ? 'en_US' : 'zh_TW', type: 'website' },
      twitter: { card: 'summary', title, description },
    } : {}),
  };
}
