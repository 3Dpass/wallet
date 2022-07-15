import { atom } from "jotai";
import type { ApiPromise } from "@polkadot/api";
import type { Toaster } from "@blueprintjs/core";

export const polkadotApiAtom = atom<ApiPromise | false>(false);
export const toasterAtom = atom<Toaster | false>(false);
export const blocksAtom = atom([]);
