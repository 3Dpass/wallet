import { useAtomValue } from "jotai";
import { toasterAtom } from "../atoms";
import type { ToasterInstance } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";

export default function useToaster(): ToasterInstance {
  const { t } = useTranslation();
  const dummy = {
    show: () => t('commons.lbl_loading'),
    dismiss() {},
    clear() {},
    getToasts() {
      return [];
    },
  } satisfies ToasterInstance;
  return useAtomValue(toasterAtom) || dummy;
}
