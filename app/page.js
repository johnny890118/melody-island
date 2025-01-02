"use client";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
    doc,
    getDoc,
    setDoc,
    query,
    where,
    getDocs,
    collection,
} from "firebase/firestore";
import { db } from "./config/firebase";
import { v4 as uuidv4 } from "uuid";
import CustomDialog from "@/components/CustomDialog";

const HomePage = () => {
    const user = useSelector((state) => state.auth.user);
    const [userRoom, setUserRoom] = useState(null);
    const router = useRouter();

    const handleCreateRoom = async ({ islandName, islandPassword }) => {
        const newIslandId = uuidv4();
        const islandData = {
            name: islandName,
            password: islandPassword,
            createdBy: user.uid,
            id: newIslandId,
            playlist: [],
            currentVideo: null,
            timestamp: null,
        };

        await setDoc(doc(db, "islands", newIslandId), islandData);
        setUserRoom(newIslandId);
        router.push(`/island/${newIslandId}`);
    };

    const handleJoinRoom = async ({ islandId, islandPassword }) => {
        const islandDoc = await getDoc(doc(db, "islands", islandId));
        if (!islandDoc.exists()) return alert("Room not found.");

        const islandData = islandDoc.data();
        if (islandData.password !== islandPassword)
            return alert("Incorrect password.");

        router.push(`/island/${islandId}`);
    };

    useEffect(() => {
        const checkUserIsland = async () => {
            if (user && user.uid) {
                const islandsRef = collection(db, "islands");
                const q = query(islandsRef, where("createdBy", "==", user.uid));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const userRoomId = querySnapshot.docs[0].id;
                    setUserRoom(userRoomId);
                }
            }
        };

        checkUserIsland();
    }, [user, router]);

    return (
        <div className="p-4 bg-[#fff8e1]">
            <h1 className="text-2xl mb-4">Welcome to Melody Island</h1>
            <div className="space-y-4 flex flex-col">
                {userRoom ? (
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                        onClick={() => router.push(`/island/${userRoom}`)}
                    >
                        我的島嶼
                    </button>
                ) : (
                    <CustomDialog
                        title="創建島嶼"
                        description="輸入屬於您的島嶼名稱及密碼"
                        inputs={[
                            { label: "islandName", placeholder: "島嶼名稱" },
                            {
                                label: "islandPassword",
                                placeholder: "密碼",
                                type: "password",
                            },
                        ]}
                        onConfirm={handleCreateRoom}
                        triggerLabel="創建島嶼"
                    />
                )}

                <CustomDialog
                    title="加入島嶼"
                    description="輸入島嶼 ID及密碼"
                    inputs={[
                        { label: "islandId", placeholder: "島嶼 ID" },
                        {
                            label: "islandPassword",
                            placeholder: "密碼",
                            type: "password",
                        },
                    ]}
                    onConfirm={handleJoinRoom}
                    triggerLabel="加入島嶼"
                />
            </div>
        </div>
    );
};

export default HomePage;
