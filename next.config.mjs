/** @type {import('next').NextConfig} */
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'melody-island';
const firebaseAuthHost = firebaseProjectId ? `${firebaseProjectId}.firebaseapp.com` : null;

const nextConfig = {
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
