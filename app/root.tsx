import { Link, Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
// @ts-ignore
import styles from "./styles/app.css";
import { Alignment, Classes, Navbar, NavbarGroup, NavbarHeading, Toaster } from "@blueprintjs/core";
import { useEffect, useRef } from "react";
import { polkadotApiAtom, toasterAtom } from "./atoms";
import { useSetAtom } from "jotai";
import Wallet from "./components/Wallet.client";
import { endpoint, rpc, types } from "./api.config";
import { ClientOnly } from "remix-utils";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { withSentry } from "@sentry/remix";

export const meta = () => ({
  charset: "utf-8",
  title: "3DP Explorer",
  viewport: "width=device-width,initial-scale=1",
});

export function links() {
  return [
    {
      rel: "icon",
      href: "/favicon.png",
      type: "image/png",
    },
    { rel: "stylesheet", href: styles },
  ];
}

function App() {
  const toasterRef = useRef<Toaster>();
  const setToaster = useSetAtom(toasterAtom);
  const setApi = useSetAtom(polkadotApiAtom);

  useEffect(() => {
    setToaster(toasterRef.current);
  }, [setToaster, toasterRef]);

  useEffect(() => {
    const provider = new WsProvider(endpoint);
    ApiPromise.create({ provider, rpc, types }).then(async (api) => {
      setApi(api);
    });
  }, [setApi]);

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className={Classes.DARK}>
        <Toaster ref={toasterRef} />
        <Navbar>
          <NavbarGroup align={Alignment.LEFT}>
            <NavbarHeading className="whitespace-nowrap">
              <Link to="" style={{ color: "white" }}>
                <strong>3DP</strong> Wallet
              </Link>
            </NavbarHeading>
          </NavbarGroup>
          <NavbarGroup align={Alignment.RIGHT}>
            <ClientOnly>{() => <Wallet />}</ClientOnly>
          </NavbarGroup>
        </Navbar>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export default withSentry(App);
