"use client";

import "./globals.css";
import { Provider } from "react-redux";
import store from "@/store/store";
import Navbar from "@/components/Navbar";

const RootLayoutClient = ({ children }) => {
    return (
        <Provider store={store}>
            <Navbar />
            {children}
        </Provider>
    );
};

export default RootLayoutClient;
