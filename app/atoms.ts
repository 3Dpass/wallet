import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ApiPromise } from "@polkadot/api";
import type { Toaster } from "@blueprintjs/core";
import { IBlock } from "./components/types";

export interface IFormatOptions {
  decimals: number;
  chainSS58: number;
  unit: string;
}

// RPC API
export const defaultEndpoint = "wss://rpc2.3dpass.org";
export const apiEndpointAtom = atomWithStorage<string>("apiEndpoint_v3", defaultEndpoint);
export const apiAtom = atom<ApiPromise | false>(false);
export const formatOptionsAtom = atomWithStorage<IFormatOptions | false>("formatOptions_v1", false);

// Explorer GraphQL API
export const apiExplorerEndpointAtom = atomWithStorage<string>("apiExplorerEndpoint_v1", "https://explorer-api.3dpass.org/graphql/");

export const toasterAtom = atom<Toaster | false>(false);
export const blocksAtom = atom<IBlock[]>([]);
export const bestNumberFinalizedAtom = atom<bigint>(BigInt(0));
