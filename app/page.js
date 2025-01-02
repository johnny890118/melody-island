"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./config/firebase";
import { v4 as uuidv4 } from "uuid";
import CustomDialog from "@/components/CustomDialog";

const HomePage = () => {
    const user = useSelector((state) => state.auth.user);
    const [userRoom, setUserRoom] = useState(null);
    const router = useRouter();

    const handleCreateRoom = async ({ roomName, roomPassword }) => {
        const newRoomId = uuidv4();
        const roomData = {
            name: roomName,
            password: roomPassword,
            createdBy: user.uid,
            id: newRoomId,
            playlist: [],
            currentVideo: null,
            timestamp: null,
        };
        await setDoc(doc(db, "rooms", newRoomId), roomData);
        setUserRoom(newRoomId);
        router.push(`/room/${newRoomId}`);
    };

    const handleJoinRoom = async ({ roomId, roomPassword }) => {
        const roomDoc = await getDoc(doc(db, "rooms", roomId));
        if (!roomDoc.exists()) return alert("Room not found.");

        const roomData = roomDoc.data();
        if (roomData.password !== roomPassword)
            return alert("Incorrect password.");

        router.push(`/room/${roomId}`);
    };

    return (
        <div className="p-4 mt-[80px] bg-[#fff8e1]">
            <h1 className="text-2xl mb-4">Welcome to Melody Island</h1>
            <div className="space-y-4 flex flex-col">
                {userRoom ? (
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                        onClick={() => router.push(`/room/${userRoom}`)}
                    >
                        My Room
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
