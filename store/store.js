'use client';

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import islandReducer from './islandSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    island: islandReducer,
  },
});

export default store;
