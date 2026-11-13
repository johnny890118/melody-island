import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/locales';
import { publicMetadata, siteName, siteOrigin } from '@/lib/seo';
import Home from './Home';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return publicMetadata(locale, '/');
}

export default function HomePage() {
  const website = siteOrigin && {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: new URL('/', siteOrigin).href,
  };

  return (
    <>
      {website && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, '\\u003c') }}
        />
      )}
      <Home />
    </>
  );
}
