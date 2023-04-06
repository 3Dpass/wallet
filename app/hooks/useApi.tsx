import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { apiEndpointAtom } from "../atoms";
import { RPC_CONFIG, RPC_TYPES } from "../api.config";

let sharedApiInstance: ApiPromise | undefined;

async function createApiInstance(endpoint: string): Promise<ApiPromise> {
  const wsProvider = new WsProvider(endpoint);
  return await ApiPromise.create({
    provider: wsProvider,
    types: RPC_TYPES,
    rpc: RPC_CONFIG,
  });
}

export default function useApi(): ApiPromise | undefined {
  const [api, setApi] = useState<ApiPromise | undefined>(sharedApiInstance);
  const [apiEndpoint] = useAtom(apiEndpointAtom);

  useEffect(() => {
    if (sharedApiInstance) {
      return;
    }
    createApiInstance(apiEndpoint)
      .then((apiInstance) => {
        sharedApiInstance = apiInstance;
        setApi(apiInstance);
      })
      .catch((error: Error) => {
        console.error("Failed to connect to Polkadot API:", error);
      });
  }, [apiEndpoint]);

  return api;
}
