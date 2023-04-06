import { useAtomValue } from "jotai";
import { toasterAtom } from "../atoms";
import type { ToasterInstance } from "@blueprintjs/core";

export default function useToaster(): ToasterInstance {
  const dummy = {
    show: () => "Loading...",
    dismiss() {},
    clear() {},
    getToasts() {
      return [];
    },
  } satisfies ToasterInstance;
  return useAtomValue(toasterAtom) || dummy;
}
