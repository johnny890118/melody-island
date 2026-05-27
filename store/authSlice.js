import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { auth } from '@/app/config/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';

const initialState = {
  user: null,
  status: 'idle',
  error: null,
};

// 登入
export const login = createAsyncThunk('auth/login', async (_, { rejectWithValue }) => {
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const { uid, email, displayName, photoURL } = result.user;
    return { uid, email, displayName, photoURL };
  } catch (error) {
    if (error.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return null;
    }

    return rejectWithValue({
      code: error.code,
      message: error.message,
    });
  }
});

// 登出
export const logout = createAsyncThunk('auth/logout', async () => {
  await signOut(auth);
});

// 獲取當前用戶
export const fetchUser = createAsyncThunk('auth/fetchUser', async () => {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const { uid, email, displayName, photoURL } = currentUser;
        resolve({ uid, email, displayName, photoURL });
      } else {
        resolve(null);
      }
    });
  });
});

// Slice 配置
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'idle';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'idle';
        state.error = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'idle';
        state.error = null;
      })
      .addCase(fetchUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(logout.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.payload || {
          code: action.error.code,
          message: action.error.message,
        };
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.status = 'idle';
        state.error = {
          code: action.error.code,
          message: action.error.message,
        };
      })
      .addCase(logout.rejected, (state, action) => {
        state.status = 'idle';
        state.error = {
          code: action.error.code,
          message: action.error.message,
        };
      });
  },
});

export default authSlice.reducer;
