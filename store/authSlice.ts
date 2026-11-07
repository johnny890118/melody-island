import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { auth } from '@/app/config/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { errorCode } from '@/lib/errors';
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}
interface AuthFailure {
  code?: string;
  message?: string;
}
interface AuthState {
  user: AuthUser | null;
  status: 'idle' | 'loading';
  error: AuthFailure | null;
  ready: boolean;
}
const initialState: AuthState = { user: null, status: 'idle', error: null, ready: false };
const payload = (user: User): AuthUser => {
  const { uid, email, displayName, photoURL, isAnonymous } = user;
  return { uid, email, displayName, photoURL, isAnonymous };
};
export const startGoogleLogin = createAsyncThunk<
  AuthUser,
  void,
  {
    state: { auth: AuthState };
    rejectValue: string;
  }
>(
  'auth/googleLogin',
  async (_, { rejectWithValue }) => {
    try {
      const provider = new GoogleAuthProvider();
      if (process.env.NEXT_PUBLIC_AUTH_REDIRECT === 'true') {
        await signInWithRedirect(auth, provider);
        return rejectWithValue('登入頁面未能開啟，請重試。');
      }
      return payload((await signInWithPopup(auth, provider)).user);
    } catch (error) {
      switch (errorCode(error)) {
        case 'auth/popup-closed-by-user':
          return rejectWithValue('已取消登入，可以再試一次。');
        case 'auth/unauthorized-domain':
          return rejectWithValue('此網址尚未獲得登入授權，請使用官方島嶼網址。');
        case 'auth/network-request-failed':
          return rejectWithValue('無法連接 Google 登入，請確認網路後重試。');
        case 'auth/web-storage-unsupported':
          return rejectWithValue('瀏覽器無法儲存登入狀態，請允許此網站儲存資料後重試。');
        case 'auth/popup-blocked':
          return rejectWithValue('瀏覽器封鎖了登入視窗。允許彈出視窗後再試。');
        default:
          return rejectWithValue('登入暫時無法使用，請稍後再試。');
      }
    }
  },
  { condition: (_, { getState }) => getState().auth.status === 'idle' },
);
export const logout = createAsyncThunk('auth/logout', async () => {
  await signOut(auth);
});
export const fetchUser = createAsyncThunk<AuthUser | null, void, { rejectValue: AuthFailure }>(
  'auth/fetchUser',
  async (_, { rejectWithValue }) => {
    try {
      if (process.env.NEXT_PUBLIC_AUTH_REDIRECT === 'true') await getRedirectResult(auth);
      await auth.authStateReady();
      return auth.currentUser ? payload(auth.currentUser) : null;
    } catch (error) {
      return rejectWithValue({
        code: String(errorCode(error) || 'auth/state-error'),
        message: 'Google 登入未完成，請重新按「登入」再試。',
      });
    }
  },
);
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(startGoogleLogin.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(startGoogleLogin.fulfilled, (state, action) => {
        state.user = action.payload;
        state.ready = true;
        state.status = 'idle';
        state.error = null;
      })
      .addCase(startGoogleLogin.rejected, (state) => {
        state.status = 'idle';
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.ready = true;
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
        state.ready = true;
        state.status = 'idle';
        state.error = action.payload || { code: action.error.code, message: action.error.message };
      })
      .addCase(logout.rejected, (state, action) => {
        state.status = 'idle';
        state.error = { code: action.error.code, message: action.error.message };
      });
  },
});
export default authSlice.reducer;
