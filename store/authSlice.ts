import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { auth } from '@/app/config/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { errorCode, errorMessage } from '@/lib/errors';
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
      return payload((await signInWithPopup(auth, new GoogleAuthProvider())).user);
    } catch (error) {
      switch (errorCode(error)) {
        case 'auth/popup-closed-by-user':
          return rejectWithValue('已取消登入，可以再試一次。');
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
      await auth.authStateReady();
      return auth.currentUser ? payload(auth.currentUser) : null;
    } catch (error) {
      return rejectWithValue({
        code: String(errorCode(error) || 'auth/state-error'),
        message: errorMessage(error),
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
