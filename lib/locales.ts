export const locales = ['zh-Hant', 'en'] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return value === 'zh-Hant' || value === 'en';
}

export function localizedPath(locale: Locale, path: string): string {
  return locale === 'en' ? `/en${path === '/' ? '' : path}` : path;
}
