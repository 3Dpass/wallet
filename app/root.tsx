import type { Toaster } from "@blueprintjs/core";
import {
  Alignment,
  Button,
  Classes,
  Navbar,
  NavbarGroup,
  NavbarHeading,
  OverlayToaster,
} from "@blueprintjs/core";
import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "@remix-run/react";
import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { useAtomValue, useSetAtom } from "jotai";
import type { FormEvent, LegacyRef } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { initReactI18next, useTranslation } from "react-i18next";
import { scan } from "react-scan";
import { ClientOnly } from "remix-utils";
import { apiEndpointAtom, toasterAtom } from "./atoms";
import { ApiCtxRoot } from "./components/Api";
import DialogSettings from "./components/dialogs/DialogSettings";
// @ts-expect-error - can't find styles file, fix later
import styles from "./styles/app.css";
import en from "./translations/en.json";
import es from "./translations/es.json";
import fr from "./translations/fr.json";
import pt from "./translations/pt.json";
import zh from "./translations/zh.json";
import { isValidPolkadotAddress } from "./utils/address";

export function meta() {
  return [
    { charset: "utf-8" },
    { title: "3DPass Wallet" },
    { viewport: "width=device-width,initial-scale=1" },
  ];
}

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

const lngDetector = new LanguageDetector(null, {
  order: [
    "querystring",
    "cookie",
    "localStorage",
    "sessionStorage",
    "navigator",
    "htmlTag",
    "path",
    "subdomain",
  ],
  lookupCookie: "i18next",
  lookupLocalStorage: "i18next",
  lookupQuerystring: "lng",
  lookupSessionStorage: "i18nextLng",
  lookupFromPathIndex: 0,
  lookupFromSubdomainIndex: 0,
  caches: ["localStorage", "cookie"],
});

void i18next
  .use(lngDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // Add the imported language to resource object
    resources: {
      en,
      es,
      fr,
      pt,
      zh,
    },
    fallbackLng: "en",

    interpolation: {
      escapeValue: false,
    },
  });

export default function App() {
  const { t } = useTranslation();
  const location = useLocation();
  const apiUrl = useAtomValue(apiEndpointAtom);
  const toasterRef = useRef<Toaster>();
  const setToaster = useSetAtom(toasterAtom);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [searchValue, _setSearchValue] = useState("");

  useEffect(() => {
    scan({
      enabled: process.env.NODE_ENV === "development",
    });
  }, []);

  useEffect(() => {
    setToaster(toasterRef.current);
  }, [setToaster]);

  const _handleSearchSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      // if searchValue is integer redirect to block page
      if (Number.isInteger(Number(searchValue))) {
        window.location.href = `/block/${searchValue}`;
      }
      // if searchValue is a valid address redirect to address page
      else if (isValidPolkadotAddress(searchValue)) {
        window.location.href = `/address/${searchValue}`;
      }
    },
    [searchValue]
  );

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className={Classes.DARK}>
        <OverlayToaster ref={toasterRef as LegacyRef<OverlayToaster>} />
        <ClientOnly>
          {() => (
            <ApiCtxRoot apiUrl={apiUrl}>
              <div className="container mx-auto px-4 flex flex-col min-h-screen">
                <Navbar className="flex justify-between overflow-x-auto overflow-y-hidden mb-4 mt-2">
                  <NavbarGroup align={Alignment.START}>
                    <NavbarHeading className="whitespace-nowrap flex">
                      <Link
                        to=""
                        className="text-white hover:no-underline flex items-center gap-2"
                      >
                        <img
                          src="/logo.svg"
                          alt="3Dpass Logo"
                          className="h-7"
                        />
                        <span className="mb-[-3px]">
                          {t("root.lbl_app_name")}
                        </span>
                      </Link>
                      <Link
                        to="/governance"
                        className={`text-white hover:no-underline px-1 ms-3 flex items-center gap-2 ${
                          location.pathname.startsWith("/governance")
                            ? "font-bold"
                            : ""
                        }`}
                      >
                        <span className="mb-[-3px]">
                          {t("governance.title")}
                        </span>
                      </Link>
                      <Link
                        to="/assets"
                        className={`text-white hover:no-underline px-1 ms-3 flex items-center gap-2 ${
                          location.pathname.startsWith("/assets")
                            ? "font-bold"
                            : ""
                        }`}
                      >
                        <span className="mb-[-3px]">
                          {t("assets.title", "Assets")}
                        </span>
                      </Link>
                      <a
                        href="https://3dpswap.online/"
                        className="text-white hover:no-underline px-1 ms-3 flex items-center gap-2"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="mb-[-3px]">Swap</span>
                      </a>
                      <a
                        href="https://mining.3dpscan.xyz/"
                        className="text-white hover:no-underline px-1 ms-3 flex items-center gap-2"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="mb-[-3px]">Mining</span>
                      </a>
                      <a
                        href="https://3dpscan.xyz/"
                        className="text-white hover:no-underline px-1 ms-3 flex items-center gap-2"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="mb-[-3px]">Explorer</span>
                      </a>
                      <Button
                        className="ml-2"
                        icon="cog"
                        variant="minimal"
                        onClick={() => setIsSettingsDialogOpen(true)}
                      />
                      <DialogSettings
                        isOpen={isSettingsDialogOpen}
                        onClose={() => setIsSettingsDialogOpen(false)}
                      />
                    </NavbarHeading>
                  </NavbarGroup>
                </Navbar>
                <Outlet />
                <footer className="p-4 py-8 mt-auto">
                  <div className="flex items-center gap-6 justify-center">
                    <a
                      href="https://3dpass.org/mainnet#wallet"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      How to
                    </a>
                    <a
                      href="https://github.com/3Dpass/wallet"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                      >
                        <title>GitHub Repository</title>
                        <path
                          fill="#fff"
                          d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                        />
                      </svg>
                    </a>
                  </div>
                </footer>
              </div>
            </ApiCtxRoot>
          )}
        </ClientOnly>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
