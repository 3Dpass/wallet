import { useAtomValue } from "jotai";
import { toasterAtom } from "../atoms";
import type { ToasterInstance } from "@blueprintjs/core";
import type { ToastProps } from "@blueprintjs/core/src/components/toast/toast";

export default function useToaster(): ToasterInstance {
  const dummy = {
    show: (props: ToastProps, key?: string) => "Loading...",
    dismiss(key: string) {},
    clear() {},
    getToasts() {
      return [];
    },
  } satisfies ToasterInstance;
  return useAtomValue(toasterAtom) || dummy;
}
