import { Link, Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
// @ts-expect-error
import styles from "./styles/app.css";
import { Alignment, Button, Classes, InputGroup, Navbar, NavbarGroup, NavbarHeading, Toaster, MenuItem } from "@blueprintjs/core";
import type { FormEvent, LegacyRef } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiEndpointAtom, apiExplorerEndpointAtom, toasterAtom } from "./atoms";
import { useAtomValue, useSetAtom } from "jotai";
import DialogSettings from "./components/dialogs/DialogSettings";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { isValidPolkadotAddress } from "./utils/address";
import { ApiCtxRoot } from "./components/Api";
import { ClientOnly } from "remix-utils";

import i18next from "i18next";
import { useTranslation, initReactI18next } from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './translations/en.json';
import es from './translations/es.json';
import fr from './translations/fr.json';
import pt from './translations/pt.json';

export function meta() {
  return [{ charset: "utf-8" }, { title: "3DPass Wallet" }, { viewport: "width=device-width,initial-scale=1" }];
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
  order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
  lookupCookie: "i18next",
  lookupLocalStorage: "i18next",
  lookupQuerystring: 'lng',
  lookupSessionStorage: 'i18nextLng',
  lookupFromPathIndex: 0,
  lookupFromSubdomainIndex: 0,  
  caches: ["localStorage", "cookie"]
});

i18next
  .use(lngDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // Add the imported language to resource object
    resources: {
      en,
      es,
      fr,
      pt
    },
    fallbackLng: "en",

    interpolation: {
      escapeValue: false
    }
  });

export default function App() {
  const { t } = useTranslation();
  const apiUrl = useAtomValue(apiEndpointAtom);
  const toasterRef = useRef<Toaster>();
  const setToaster = useSetAtom(toasterAtom);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  // const [data, setData] = useState<string[]>([]);
  const apiExplorerEndpoint = useAtomValue(apiExplorerEndpointAtom);

  // setData(langs);

  useEffect(() => {
    setToaster(toasterRef.current);
  }, [setToaster, toasterRef]);

  const client = new ApolloClient({
    uri: apiExplorerEndpoint,
    cache: new InMemoryCache(),
  });

  const handleSearchSubmit = useCallback(
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

  //   <NavbarGroup align={Alignment.RIGHT}>
  //   <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
  //     <Select2
  //       items={data}
  //       itemPredicate={filterLanguage}
  //       itemRenderer={renderLanguage}
  //       menuProps={{ className: "max-h-[300px] overflow-auto" }}
  //       noResults={<MenuItem disabled={true} text={t('dlg_join_pool.lbl_no_results')} roleStructure="listoption" />}
  //       onItemSelect={(lang) => handleLanguage(lang)}
  //       popoverProps={{ matchTargetWidth: true }}
  //       fill={true}
  //     ></Select2>
  //   </div>
  // </NavbarGroup>

  // const handleLanguage = (lang: string) => {
  //   i18next.changeLanguage(lang)
  // }

  // const filterLanguage: ItemPredicate<string> = (query, language, _index, exactMatch) => {
  //   const normalizedId = language.toLowerCase();
  //   const normalizedQuery = query.toLowerCase();
  //   if (exactMatch) {
  //     return normalizedId === normalizedQuery;
  //   }
  //   return normalizedId.indexOf(normalizedQuery) >= 0;
  // };

  // const renderLanguage: ItemRenderer<string> = (language: string, { handleClick, handleFocus, modifiers }) => {
  //   if (!modifiers.matchesPredicate) {
  //     return null;
  //   }
  //   return (
  //     <MenuItem
  //       className="font-mono"
  //       active={modifiers.active}
  //       disabled={modifiers.disabled}
  //       key={language}
  //       text={language}
  //       onClick={handleClick as MouseEventHandler}
  //       onFocus={handleFocus}
  //       roleStructure="listoption"
  //     />
  //   );
  // };

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className={Classes.DARK}>
        <Toaster ref={toasterRef as LegacyRef<Toaster>} />
        <ClientOnly>
          {() => (
            <ApiCtxRoot apiUrl={apiUrl}>
              <ApolloProvider client={client}>
                <div className="container mx-auto px-4">
                  <Navbar className="flex justify-between overflow-x-auto overflow-y-hidden mb-4">
                    <NavbarGroup align={Alignment.LEFT}>
                      <NavbarHeading className="whitespace-nowrap flex">
                        <Link to="" className="text-white hover:no-underline flex items-center gap-2">
                          <img src="/logo.svg" alt="3Dpass Logo" className="h-7" />
                          <span className="mb-[-3px]">{t('root.lbl_app_name')}</span>
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
                          placeholder={t('root.lbl_search_box')}
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
