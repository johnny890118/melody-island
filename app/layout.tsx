import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import StoreProvider from './StoreProvider';

export const metadata: Metadata = {
  title: 'Melody Island',
  description: '一起登島，聆聽共鳴。和朋友在私人島嶼分享歌曲、同步共聽。',
  icons: '/brand-icon.svg',
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="zh-Hant">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
};

export default RootLayout;
