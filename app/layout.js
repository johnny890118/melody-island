import StoreProvider from './StoreProvider';

export const metadata = {
  title: 'Melody Island',
  description: '一起登島，聆聽共鳴。和朋友在私人島嶼分享歌曲、同步共聽。',
  icons: '/music-island-logo.png',
};

const RootLayout = ({ children }) => {
  return (
    <html lang="zh-Hant">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
};

export default RootLayout;
