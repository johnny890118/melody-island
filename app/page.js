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
        <div className="p-4 mt-[80px]">
            <h1 className="text-2xl mb-4">Welcome to Melody Island</h1>
            <div className="space-y-4">
                {userRoom ? (
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                        onClick={() => router.push(`/room/${userRoom}`)}
                    >
                        My Room
                    </button>
                ) : (
                    <CustomDialog
                        title="Create Room"
                        description="Enter details to create a new room."
                        inputs={[
                            { label: "roomName", placeholder: "Room Name" },
                            {
                                label: "roomPassword",
                                placeholder: "Password",
                                type: "password",
                            },
                        ]}
                        onConfirm={handleCreateRoom}
                        triggerLabel="Create Room"
                    />
                )}

                <CustomDialog
                    title="Join Room"
                    description="Enter Room ID and Password to join an existing room."
                    inputs={[
                        { label: "roomId", placeholder: "Room ID" },
                        {
                            label: "roomPassword",
                            placeholder: "Password",
                            type: "password",
                        },
                    ]}
                    onConfirm={handleJoinRoom}
                    triggerLabel="Join Room"
                />
            </div>
        </div>
    );
};

export default HomePage;
