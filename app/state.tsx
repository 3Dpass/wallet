import { atom } from "jotai";
import type { ApiPromise } from "@polkadot/api";

export const polkadotApiAtom = atom<ApiPromise | false>(false);
