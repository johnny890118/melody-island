import type { NextConfig } from 'next';
import { assertStagingConfig } from './lib/staging-config';

assertStagingConfig(process.env);
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'melody-island';
const firebaseAuthHost = firebaseProjectId ? `${firebaseProjectId}.firebaseapp.com` : null;

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
          },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async rewrites() {
    if (!firebaseAuthHost) return [];

    return [
      {
        source: '/__/firebase/:file',
        destination: '/api/firebase/:file',
      },
      {
        source: '/__/auth/:path*',
        destination: `https://${firebaseAuthHost}/__/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
