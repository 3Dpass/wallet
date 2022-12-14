import { ApiPromise, WsProvider } from "@polkadot/api";
import { RPC_CONFIG, RPC_TYPES } from "./api.config";

export function getProvider(apiEndpoint): WsProvider {
  return new WsProvider(apiEndpoint, false);
}

export async function getApi(provider?: WsProvider): Promise<ApiPromise> {
  await provider.connect();
  return ApiPromise.create({ provider, rpc: RPC_CONFIG, types: RPC_TYPES });
}
