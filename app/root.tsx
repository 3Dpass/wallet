import { Link, Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
// @ts-ignore
import styles from "./styles/app.css";
import { Alignment, Button, Classes, InputGroup, Navbar, NavbarGroup, NavbarHeading, Toaster } from "@blueprintjs/core";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { apiAtom, apiEndpointAtom, apiExplorerEndpointAtom, formatOptionsAtom, toasterAtom } from "./atoms";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { RPC_CONFIG, RPC_TYPES } from "./api.config";
import { ApiPromise, WsProvider } from "@polkadot/api";
import DialogSettings from "./components/dialogs/DialogSettings";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { isValidPolkadotAddress } from "./utils/address";

export const meta = () => ({
  charset: "utf-8",
  title: "3DPass Wallet",
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

export default function App() {
  const toasterRef = useRef<Toaster>();
  const [toaster, setToaster] = useAtom(toasterAtom);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const setApi = useSetAtom(apiAtom);
  const apiEndpoint = useAtomValue(apiEndpointAtom);
  const apiExplorerEndpoint = useAtomValue(apiExplorerEndpointAtom);
  const setFormatOptions = useSetAtom(formatOptionsAtom);

  useEffect(() => {
    setToaster(toasterRef.current);
  }, [setToaster, toasterRef]);

  useEffect(() => {
    if (!toaster) {
      return;
    }

    setApi(false);
    const provider = new WsProvider(apiEndpoint, false);
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
        setFormatOptions({
          decimals: api.registry.chainDecimals[0],
          chainSS58: api.registry.chainSS58,
          unit: api.registry.chainTokens[0],
        });
      });
    });
  }, [apiEndpoint, toaster]);

  const client = new ApolloClient({
    uri: apiExplorerEndpoint,
    cache: new InMemoryCache(),
  });

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    // if searchValue is integer redirect to block page
    if (Number.isInteger(Number(searchValue))) {
      window.location.href = `/block/${searchValue}`;
    }
    // if searchValue is a valid address redirect to address page
    else if (isValidPolkadotAddress(searchValue)) {
      window.location.href = `/address/${searchValue}`;
    }
  }

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className={Classes.DARK}>
        <Toaster ref={toasterRef} />
        <ApolloProvider client={client}>
          <div className="container mx-auto px-4">
            <Navbar className="flex justify-between overflow-x-auto overflow-y-hidden mb-4">
              <NavbarGroup align={Alignment.LEFT}>
                <NavbarHeading className="whitespace-nowrap flex">
                  <Link to="" style={{ color: "white" }} className="mt-[3px] mr-2">
                    <strong>3DPass</strong> Wallet
                  </Link>
                  <Button className="ml-2" icon="cog" minimal={true} onClick={() => setIsSettingsDialogOpen(true)} />
                  <DialogSettings isOpen={isSettingsDialogOpen} onClose={() => setIsSettingsDialogOpen(false)} />
                </NavbarHeading>
              </NavbarGroup>
              <NavbarGroup align={Alignment.RIGHT}>
                <form onSubmit={handleSearchSubmit}>
                  <InputGroup
                    leftIcon="search"
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Search for address or block number..."
                    value={searchValue}
                    size={40}
                    type="search"
                  />
                </form>
              </NavbarGroup>
            </Navbar>
            <Outlet />
            <footer className="p-4">
              <div className="text-right">
                <a href="https://github.com/3Dpass/wallet" className="inline-block">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path
                      fill="#fff"
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                    />
                  </svg>
                </a>
              </div>
            </footer>
          </div>
        </ApolloProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
