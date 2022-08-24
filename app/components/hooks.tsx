import { ss58formats } from "../api.config";
import { useAtomValue } from "jotai";
import { networkAtom } from "../atoms";

export function useSS58Format() {
  const network = useAtomValue(networkAtom);
  return ss58formats[network];
}
