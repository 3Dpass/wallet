import { ApiPromise, WsProvider } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import keyring from "@polkadot/ui-keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { useSetAtom } from "jotai/index";
import React, { useEffect } from "react";
import {
  genesisHashes,
  NETWORK_MAINNET,
  NETWORK_TEST,
  RPC_CONFIG,
  RPC_TYPES,
  ss58formats,
} from "../api.config";
import { defaultEndpoint, formatOptionsAtom } from "../atoms";
import { createMockApi } from "../utils/mock";
import { loadWeb3Accounts } from "./Web3.client";

interface Props {
  children: React.ReactNode;
  apiUrl: string;
  isMockMode?: boolean;
}

interface Context {
  api: ApiPromise | undefined;
  keyringLoaded: boolean;
  accounts: KeyringPair[];
}

const ApiCtx = React.createContext<Context>({
  api: undefined,
  keyringLoaded: false,
  accounts: [],
});

export function ApiCtxRoot({
  apiUrl,
  children,
  isMockMode = false,
}: Props): React.ReactElement<Props> | null {
  const [api, setApi] = React.useState<ApiPromise>();
  const [accounts, setAccounts] = React.useState<KeyringPair[]>([]);
  const [keyringLoaded, setKeyringLoaded] = React.useState(false);
  const setFormatOptions = useSetAtom(formatOptionsAtom);

  useEffect(() => {
    if (isMockMode) {
      setApi(createMockApi() as unknown as ApiPromise);
      return;
    }

    let wsProvider: WsProvider;
    try {
      wsProvider = new WsProvider(apiUrl);
    } catch (_e) {
      // use default endpoint
      wsProvider = new WsProvider(defaultEndpoint);
    }

    ApiPromise.create({
      provider: wsProvider,
      types: RPC_TYPES,
      rpc: RPC_CONFIG,
    }).then((api) => {
      setApi(api);
    });
  }, [apiUrl, isMockMode]);

  useEffect(() => {
    if (!api || keyringLoaded) {
      return;
    }
    
    const ss58format = api.registry.chainSS58 || ss58formats[NETWORK_MAINNET];
    setFormatOptions({
      decimals: api.registry.chainDecimals[0],
      chainSS58: ss58format,
      unit: api.registry.chainTokens[0],
    });

    async function loadAllAccounts(ss58Format: number) {
      await cryptoWaitReady();
      const isMainnet = ss58Format === ss58formats[NETWORK_MAINNET];
      const genesisHash =
        genesisHashes[isMainnet ? NETWORK_MAINNET : NETWORK_TEST];
      const injected = await loadWeb3Accounts(genesisHash, ss58Format);
      const accounts = injected?.map(({ address, meta }) => ({
        address,
        meta: {
          ...meta,
          genesisHash: meta.genesisHash as `0x${string}` | null | undefined,
        },
      }));
      keyring.loadAll({ ss58Format, type: "sr25519" }, accounts);
    }

    let subscription: { unsubscribe: () => void } | undefined;

    loadAllAccounts(ss58format).then(() => {
      // Set keyring loaded AFTER the keyring is actually loaded
      setKeyringLoaded(true);
      subscription = keyring.accounts.subject.subscribe(() => {
        setAccounts(keyring.getPairs());
      });
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [api, keyringLoaded, setFormatOptions]);

  const contextValue = React.useMemo(
    () => ({ api, keyringLoaded, accounts }),
    [api, keyringLoaded, accounts]
  );

  return <ApiCtx.Provider value={contextValue}>{children}</ApiCtx.Provider>;
}

export function useApi(): ApiPromise | undefined {
  return React.useContext(ApiCtx).api;
}

export function useKeyringLoaded(): boolean {
  return React.useContext(ApiCtx).keyringLoaded;
}

export function useAccounts(): KeyringPair[] {
  return React.useContext(ApiCtx).accounts;
}
