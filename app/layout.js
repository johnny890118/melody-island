import RootLayoutClient from "./RootLayoutClient";

export const metadata = {
    title: "Melody Island",
    description: "Platforms for listening to music on various islands.",
};

const RootLayout = ({ children }) => {
    return (
        <html lang="en">
            <body>
                <RootLayoutClient>{children}</RootLayoutClient>
            </body>
        </html>
    );
};

export default RootLayout;
