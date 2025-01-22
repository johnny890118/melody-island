import StoreProvider from './StoreProvider';

export const metadata = {
  title: 'Melody Island',
  description: 'Platforms for listening to music on various islands.',
  icons: '/music-island-logo.png',
};

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
};

export default RootLayout;
