import type { ToasterInstance } from "@blueprintjs/core";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { IBlock } from "./components/types";

interface IFormatOptions {
  decimals: number;
  chainSS58: number;
  unit: string;
}

// RPC API (use `_v{X}` suffix to have possibility to change default atom value in future)
export const defaultEndpoint = "wss://rpc.3dpass.org";
export const apiEndpointAtom = atomWithStorage<string>(
  "apiEndpoint_v6",
  defaultEndpoint
);
export const formatOptionsAtom = atom<IFormatOptions | false>(false);
export const apiAdvancedModeAtom = atomWithStorage<boolean>(
  "apiAdvancedMode_v1",
  false
);
export const poolIdsAtom = atomWithStorage<string[]>("poolIds_v1", []);

export const toasterAtom = atom<ToasterInstance | undefined>(undefined);
export const blocksAtom = atom<IBlock[]>([]);
export const bestNumberFinalizedAtom = atom<bigint>(BigInt(0));
export const lastSelectedAccountAtom = atomWithStorage<string | null>(
  "lastSelectedAccount_v1",
  null
);
