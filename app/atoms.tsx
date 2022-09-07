import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ApiPromise } from "@polkadot/api";
import type { Toaster } from "@blueprintjs/core";

export interface IFormatOptions {
  decimals: number;
  chainSS58: number;
  unit: string;
}

// RPC API
export const apiEndpointAtom = atomWithStorage<string>("apiEndpoint_v3", "wss://rpc2.3dpass.org");
export const apiAtom = atom<ApiPromise | false>(false);
export const formatOptionsAtom = atom<IFormatOptions | false>(false);

// Explorer GraphQL API
export const apiExplorerEndpointAtom = atomWithStorage<string>("apiExplorerEndpoint_v1", "https://explorer-api.3dpass.org/graphql/");

export const toasterAtom = atom<Toaster | false>(false);
export const blocksAtom = atom([]);
