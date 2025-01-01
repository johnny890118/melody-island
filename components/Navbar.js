"use client";

import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchUser, login, logout } from "@/store/authSlice";
import { Button } from "./ui/button";
import Image from "next/image";
import Link from "next/link";

const Navbar = () => {
    const user = useSelector((state) => state.auth.user);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(fetchUser());
    }, [dispatch]);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90">
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
                        <Link href="/" className="nav-text font-bold text-xl">
                            Melody Island
                        </Link>
                    </div>
                    <div>
                        {!user ? (
                            <Button
                                onClick={() => dispatch(login())}
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
                            </Button>
                        ) : (
                            <div className="flex items-center">
                                <p className="text-base font-bold text-[#FEBE98]">
                                    Welcome, {user.displayName}
                                </p>
                                <Button onClick={() => dispatch(logout())}>
                                    <p className="nav-text text-base font-bold">
                                        登出
                                    </p>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
