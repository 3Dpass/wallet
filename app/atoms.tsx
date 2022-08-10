import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ApiPromise } from "@polkadot/api";
import type { Toaster } from "@blueprintjs/core";
import type { ApolloClient, NormalizedCacheObject } from "@apollo/client";

// RPC API
export const apiEndpointAtom = atomWithStorage<string>("apiEndpoint", "wss://rpc2.3dpass.org");
export const apiAtom = atom<ApiPromise | false>(false);
export const formatOptionsAtom = atom<object | false>(false);

// Explorer GraphQL API
export const apiExplorerEndpointAtom = atomWithStorage<string>("apiExplorerEndpoint", "https://explorer-api.3dpass.org/graphql/");
export const apiExplorerAtom = atom<ApolloClient<NormalizedCacheObject> | false>(false);

export const toasterAtom = atom<Toaster | false>(false);
export const blocksAtom = atom([]);
