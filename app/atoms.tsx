import { atom } from "jotai";
import type { ApiPromise } from "@polkadot/api";
import type { Toaster } from "@blueprintjs/core";
import { atomWithStorage } from "jotai/utils";

export const apiEndpointAtom = atomWithStorage<string>("apiEndpoint", "wss://rpc2.3dpass.org");
export const apiAtom = atom<ApiPromise | false>(false);
export const toasterAtom = atom<Toaster | false>(false);
export const blocksAtom = atom([]);
