"use client";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import RoomCreatorButton from "./components/RoomCreatorButton";
import RoomJoinerButton from "./components/RoomJoinerButton";
import MyRoomButton from "./components/MyRoomButton";
import { db } from "./firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

const HomePage = () => {
    const [user, setUser] = useState(null);
    const [roomId, setRoomId] = useState(null);

    useEffect(() => {
        const fetchUserRoom = async () => {
            if (!user) return;

            const q = query(
                collection(db, "rooms"),
                where("createdBy", "==", user.uid)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setRoomId(querySnapshot.docs[0].id);
            } else {
                setRoomId(null);
            }
        };

        fetchUserRoom();
    }, [user]);

    return (
        <div>
            <Navbar onLogin={setUser} />
            <div style={{ textAlign: "center", marginTop: "118px" }}>
                <h1>Melody Island</h1>
                {user ? (
                    roomId ? (
                        <>
                            <MyRoomButton roomId={roomId} />
                            <RoomJoinerButton />
                        </>
                    ) : (
                        <>
                            <RoomCreatorButton user={user} />
                            <RoomJoinerButton />
                        </>
                    )
                ) : (
                    <>
                        <p>Log in to create a room.</p>
                        <RoomJoinerButton />
                    </>
                )}
            </div>
        </div>
    );
};

export default HomePage;
