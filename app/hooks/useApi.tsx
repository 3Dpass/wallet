import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { apiEndpointAtom } from "../atoms";
import { RPC_CONFIG, RPC_TYPES } from "../api.config";

// Create a shared instance variable
let sharedApiInstance: ApiPromise | undefined;

async function createApiInstance(endpoint: string): Promise<ApiPromise> {
  const wsProvider = new WsProvider(endpoint);
  const api = await ApiPromise.create({
    provider: wsProvider,
    types: RPC_TYPES,
    rpc: RPC_CONFIG,
  });
  return api;
}

interface UseApiResult {
  api: ApiPromise | undefined;
  isLoading: boolean;
}

export function useApi(): UseApiResult {
  const [api, setApi] = useState<ApiPromise | undefined>(sharedApiInstance);
  const [isLoading, setIsLoading] = useState<boolean>(!sharedApiInstance);
  const [apiEndpoint] = useAtom(apiEndpointAtom);

  useEffect(() => {
    if (!sharedApiInstance) {
      setIsLoading(true);
      createApiInstance(apiEndpoint)
        .then((apiInstance) => {
          sharedApiInstance = apiInstance;
          setApi(apiInstance);
          setIsLoading(false);
        })
        .catch((error: Error) => {
          console.error("Failed to connect to Polkadot API:", error);
          setIsLoading(false);
        });
    }
  }, [apiEndpoint]);

  return { api, isLoading };
}
