import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { auth } from '@/app/config/firebase';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  type User,
} from 'firebase/auth';
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
export const startGoogleLogin = () => signInWithRedirect(auth, new GoogleAuthProvider());
export const logout = createAsyncThunk('auth/logout', async () => {
  await signOut(auth);
});
export const fetchUser = createAsyncThunk<AuthUser | null, void, { rejectValue: AuthFailure }>(
  'auth/fetchUser',
  async (_, { rejectWithValue }) => {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) return payload(result.user);
    } catch (error) {
      if (errorCode(error) !== 'auth/no-redirect-result')
        return rejectWithValue({
          code: String(errorCode(error) || 'auth/redirect-result-error'),
          message: errorMessage(error),
        });
    }
    try {
      const user = await new Promise<User | null>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });
      return user ? payload(user) : null;
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
