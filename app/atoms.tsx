import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ApiPromise } from "@polkadot/api";
import type { Toaster } from "@blueprintjs/core";
import { NETWORK_MAINNET } from "./api.config";

// RPC API
export const apiEndpointAtom = atomWithStorage<string>("apiEndpoint_v2", "wss://rpc.3dpass.org");
export const apiAtom = atom<ApiPromise | false>(false);
export const networkAtom = atomWithStorage<string>("network_v2", NETWORK_MAINNET);
export const formatOptionsAtom = atom<object | false>(false);

// Explorer GraphQL API
export const apiExplorerEndpointAtom = atomWithStorage<string>("apiExplorerEndpoint_v1", "https://explorer-api.3dpass.org/graphql/");

export const toasterAtom = atom<Toaster | false>(false);
export const blocksAtom = atom([]);
