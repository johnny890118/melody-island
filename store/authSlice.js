import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { auth } from "@/app/config/firebase";
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
} from "firebase/auth";

const initialState = {
    user: null,
    status: "idle",
};

// 登入
export const login = createAsyncThunk("auth/login", async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const { uid, email, displayName, photoURL } = result.user;
    return { uid, email, displayName, photoURL };
});

// 登出
export const logout = createAsyncThunk("auth/logout", async () => {
    await signOut(auth);
});

// 獲取當前用戶
export const fetchUser = createAsyncThunk("auth/fetchUser", async () => {
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
    name: "auth",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchUser.fulfilled, (state, action) => {
                state.user = action.payload;
                state.status = "idle";
            })
            .addCase(login.fulfilled, (state, action) => {
                state.user = action.payload;
                state.status = "idle";
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.status = "idle";
            })
            .addCase(fetchUser.pending, (state) => {
                state.status = "loading";
            })
            .addCase(login.pending, (state) => {
                state.status = "loading";
            })
            .addCase(logout.pending, (state) => {
                state.status = "loading";
            });
    },
});

export default authSlice.reducer;
