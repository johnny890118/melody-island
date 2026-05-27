import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { auth } from '@/app/config/firebase';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';

const initialState = {
  user: null,
  status: 'idle',
  error: null,
};

const getUserPayload = (user) => {
  const { uid, email, displayName, photoURL } = user;
  return { uid, email, displayName, photoURL };
};

// 登入
export const startGoogleLogin = () => {
  const provider = new GoogleAuthProvider();
  return signInWithRedirect(auth, provider);
};

// 登出
export const logout = createAsyncThunk('auth/logout', async () => {
  await signOut(auth);
});

// 獲取當前用戶
export const fetchUser = createAsyncThunk('auth/fetchUser', async (_, { rejectWithValue }) => {
  try {
    const redirectResult = await getRedirectResult(auth);

    if (redirectResult?.user) {
      return getUserPayload(redirectResult.user);
    }
  } catch (error) {
    return rejectWithValue({
      code: error.code || 'auth/redirect-result-error',
      message: error.message || String(error),
    });
  }

  const currentUser = await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

  if (currentUser) {
    return getUserPayload(currentUser);
  }

  return null;
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
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'idle';
        state.error = null;
      })
      .addCase(fetchUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(logout.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.payload || {
          code: action.error.code,
          message: action.error.message,
        };
      })
      .addCase(logout.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.payload || {
          code: action.error.code,
          message: action.error.message,
        };
      });
  },
});

export default authSlice.reducer;
