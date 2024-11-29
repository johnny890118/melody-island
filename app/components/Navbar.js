"use client";
import React from "react";
import { auth, provider } from "../firebaseConfig";
import { signInWithPopup, signOut } from "firebase/auth";
import Image from "next/image";

const Navbar = ({ onLogin }) => {
    const handleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            onLogin(user);
        } catch (error) {
            console.error("Login error:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            onLogin(null);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <div className="flex items-center justify-between">
            Navbar
            <div>
                {auth.currentUser ? (
                    <button onClick={handleLogout}>登出</button>
                ) : (
                    <button
                        onClick={handleLogin}
                        className="flex items-center gap-2"
                    >
                        <Image
                            src="/google.png"
                            alt="Google logo"
                            width={20}
                            height={20}
                        />
                        <p>登入 / 註冊</p>
                    </button>
                )}
            </div>
        </div>
    );
};

export default Navbar;
