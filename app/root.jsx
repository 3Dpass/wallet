import {Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration} from "@remix-run/react";
import styles from "./styles/app.css";

export const meta = () => ({
    charset: "utf-8",
    title: "3DP Explorer",
    viewport: "width=device-width,initial-scale=1",
});

export function links() {
    return [{rel: "stylesheet", href: styles}]
}

export default function App() {
    return (
        <html lang="en">
        <head>
            <Meta/>
            <Links/>
        </head>
        <body>
        <Outlet/>
        <ScrollRestoration/>
        <Scripts/>
        <LiveReload/>
        </body>
        </html>
    );
}
