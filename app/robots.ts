import type { MetadataRoute } from 'next';
import { preview, siteOrigin } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', ...(preview ? { disallow: '/' } : { allow: '/' }) },
    ...(siteOrigin ? { sitemap: new URL('/sitemap.xml', siteOrigin).href } : {}),
  };
}
