import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { IBlock } from "./components/types";
import type { ToasterInstance } from "@blueprintjs/core";

export interface IFormatOptions {
  decimals: number;
  chainSS58: number;
  unit: string;
}

// RPC API
export const defaultEndpoint = "wss://rpc.3dpass.org";
export const apiEndpointAtom = atomWithStorage<string>("apiEndpoint_v4", defaultEndpoint);
export const formatOptionsAtom = atom<IFormatOptions | false>(false);
export const apiAdvancedModeAtom = atomWithStorage<boolean>("apiAdvancedMode_v1", false);

// Explorer GraphQL API
export const apiExplorerEndpointAtom = atomWithStorage<string>("apiExplorerEndpoint_v1", "https://explorer-api.3dpass.org/graphql/");

export const toasterAtom = atom<ToasterInstance | undefined>(undefined);
export const blocksAtom = atom<IBlock[]>([]);
export const bestNumberFinalizedAtom = atom<bigint>(BigInt(0));
