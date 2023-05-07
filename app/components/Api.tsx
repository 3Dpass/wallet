import React, { useEffect } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { NETWORK_MAINNET, RPC_CONFIG, RPC_TYPES, ss58formats } from "../api.config";
import { useSetAtom } from "jotai/index";
import { formatOptionsAtom } from "../atoms";

interface Props {
  children: React.ReactNode;
  apiUrl: string;
}

export const ApiCtx = React.createContext<ApiPromise | undefined>(undefined as any);

export function ApiCtxRoot({ apiUrl, children }: Props): React.ReactElement<Props> | null {
  const [api, setApi] = React.useState<ApiPromise>();
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

  return <ApiCtx.Provider value={api}>{children}</ApiCtx.Provider>;
}

export default function useApi(): ApiPromise | undefined {
  return React.useContext(ApiCtx);
}
