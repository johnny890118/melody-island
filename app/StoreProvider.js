'use client';
import './globals.css';
import { Provider } from 'react-redux';
import store from '@/store/store';
import Navbar from '@/components/Navbar';
export default function StoreProvider({ children }) {
  return (
    <Provider store={store}>
      <a href="#main-content" className="skip-link">
        跳至主要內容
      </a>
      <Navbar />
      {children}
    </Provider>
  );
}
