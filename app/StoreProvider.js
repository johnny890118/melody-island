'use client';

import './globals.css';
import { Provider } from 'react-redux';
import store from '@/store/store';
import Navbar from '@/components/Navbar';
import Loading from '@/components/Loading';

const StoreProvider = ({ children }) => {
  return (
    <Provider store={store}>
      <Loading />
      <Navbar />
      {children}
    </Provider>
  );
};

export default StoreProvider;
