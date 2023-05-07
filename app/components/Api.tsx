import React, { useEffect } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { genesisHashes, NETWORK_MAINNET, NETWORK_TEST, RPC_CONFIG, RPC_TYPES, ss58formats } from "../api.config";
import { useSetAtom } from "jotai/index";
import { formatOptionsAtom } from "../atoms";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useSS58Format } from "../hooks/useSS58Format";
import { loadWeb3Accounts } from "./Web3.client";

interface Props {
  children: React.ReactNode;
  apiUrl: string;
}

interface Context {
  api: ApiPromise | undefined;
  keyringLoaded: boolean;
  accounts: KeyringPair[];
}

export const ApiCtx = React.createContext<Context>({ api: undefined, keyringLoaded: false, accounts: [] });

export function ApiCtxRoot({ apiUrl, children }: Props): React.ReactElement<Props> | null {
  const ss58Format = useSS58Format();
  const isMainnet = ss58Format === ss58formats[NETWORK_MAINNET];

  const [api, setApi] = React.useState<ApiPromise>();
  const [accounts, setAccounts] = React.useState<KeyringPair[]>([]);
  const [keyringLoaded, setKeyringLoaded] = React.useState(false);
  const setFormatOptions = useSetAtom(formatOptionsAtom);

  useEffect(() => {
    const wsProvider = new WsProvider(apiUrl);
    ApiPromise.create({
      provider: wsProvider,
      types: RPC_TYPES,
      rpc: RPC_CONFIG,
    }).then((api) => {
      setApi(api);
    });
  }, [apiUrl]);

  useEffect(() => {
    if (!api) {
      return;
    }
    setFormatOptions({
      decimals: api.registry.chainDecimals[0],
      chainSS58: api.registry.chainSS58 || ss58formats[NETWORK_MAINNET],
      unit: api.registry.chainTokens[0],
    });
  }, [api, setFormatOptions]);

  useEffect(() => {
    if (!api || keyringLoaded) {
      return;
    }
    setKeyringLoaded(true);

    async function loadAllAccounts(ss58Format: any) {
      await cryptoWaitReady();
      const genesisHash = genesisHashes[isMainnet ? NETWORK_MAINNET : NETWORK_TEST];
      const injected = await loadWeb3Accounts(genesisHash, ss58Format);
      keyring.loadAll({ ss58Format, type: "sr25519" }, injected);
    }

    let subscription: any;

    loadAllAccounts(ss58Format).then(() => {
      subscription = keyring.accounts.subject.subscribe(() => {
        setAccounts(keyring.getPairs());
      });
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [isMainnet, ss58Format, api, keyringLoaded]);

  return <ApiCtx.Provider value={{ api, keyringLoaded, accounts }}>{children}</ApiCtx.Provider>;
}

export function useApi(): ApiPromise | undefined {
  return React.useContext(ApiCtx).api;
}

export function useAccounts(): KeyringPair[] {
  return React.useContext(ApiCtx).accounts;
}
