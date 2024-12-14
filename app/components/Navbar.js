"use client";
import React from "react";
import { auth, provider } from "../config/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";

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
        <>
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/90">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center py-5 mx-auto c-space">
                        <div className="flex items-center gap-2">
                            <Image
                                src="/music-island-logo.png"
                                alt="Google logo"
                                width={40}
                                height={40}
                                className="w-10 h-10"
                            />
                            <Link
                                href="/"
                                className="nav-text font-bold text-xl"
                            >
                                Melody Island
                            </Link>
                        </div>
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
                                        width={16}
                                        height={16}
                                        className="w-4 h-4"
                                    />
                                    <p className="nav-text text-base font-bold">
                                        登入
                                    </p>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Navbar;
