import { Link, Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
// @ts-ignore
import styles from "./styles/app.css";
import { Alignment, Button, Classes, Navbar, NavbarGroup, NavbarHeading, Toaster } from "@blueprintjs/core";
import { useEffect, useRef, useState } from "react";
import { apiAtom, apiEndpointAtom, toasterAtom } from "./atoms";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import Wallet from "./components/wallet/Wallet.client";
import { RPC_CONFIG, RPC_TYPES } from "./api.config";
import { ClientOnly } from "remix-utils";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { withSentry } from "@sentry/remix";
import DialogSettings from "./components/dialogs/DialogSettings";

export const meta = () => ({
  charset: "utf-8",
  title: "3DP Wallet",
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
  const [toaster, setToaster] = useAtom(toasterAtom);
  const setApi = useSetAtom(apiAtom);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const apiEndpoint = useAtomValue(apiEndpointAtom);

  useEffect(() => {
    setToaster(toasterRef.current);
  }, [setToaster, toasterRef]);

  useEffect(() => {
    if (!toaster) {
      return;
    }

    setApi(false);
    const provider = new WsProvider(apiEndpoint, false);
    provider.on("connected", (e) => {
      toaster &&
        toaster.show({
          icon: "tick",
          intent: "success",
          message: `API connected`,
        });
    });
    provider.on("disconnected", () => {
      toaster &&
        toaster.show({
          icon: "error",
          intent: "warning",
          message: `API disconnected`,
        });
    });
    provider.on("error", (e) => {
      toaster &&
        toaster.show({
          icon: "error",
          intent: "danger",
          message: `API connection error: ${e.message}`,
        });
    });
    provider.connect().then(() => {
      ApiPromise.create({ provider, rpc: RPC_CONFIG, types: RPC_TYPES }).then(async (api) => {
        setApi(api);
      });
    });
  }, [apiEndpoint, toaster]);

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
              <Button className="ml-2" icon="cog" minimal={true} onClick={() => setIsSettingsDialogOpen(true)} />
              <DialogSettings isOpen={isSettingsDialogOpen} onClose={() => setIsSettingsDialogOpen(false)} />
            </NavbarHeading>
          </NavbarGroup>
          <NavbarGroup align={Alignment.RIGHT}>
            <ClientOnly>{() => <Wallet />}</ClientOnly>
          </NavbarGroup>
        </Navbar>
        <div className="container mx-auto p-4">
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export default withSentry(App);
