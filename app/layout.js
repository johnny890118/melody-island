import StoreProvider from './StoreProvider';

export const metadata = {
  title: 'Melody Island',
  description: 'Platforms for listening to music on various islands.',
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
