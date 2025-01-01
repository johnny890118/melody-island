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
    return result.user;
});

// 登出
export const logout = createAsyncThunk("auth/logout", async () => {
    await signOut(auth);
});

// 獲取當前用戶
export const fetchUser = createAsyncThunk("auth/fetchUser", async () => {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (currentUser) => {
            resolve(currentUser);
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
            })
            .addCase(login.fulfilled, (state, action) => {
                state.user = action.payload;
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
            });
    },
});

export default authSlice.reducer;
