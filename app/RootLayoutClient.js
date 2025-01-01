"use client";

import "./globals.css";
import { Provider } from "react-redux";
import store from "@/store/store";
import Navbar from "@/components/Navbar";

export default function RootLayoutClient({ children }) {
    return (
        <Provider store={store}>
            <Navbar />
            {children}
        </Provider>
    );
}
