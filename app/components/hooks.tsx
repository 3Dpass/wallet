import { NETWORK_MAINNET, ss58formats } from "../api.config";
import { useAtomValue } from "jotai";
import { formatOptionsAtom } from "../atoms";

export function useSS58Format(): number | false {
  const formatOptions = useAtomValue(formatOptionsAtom);
  return formatOptions ? formatOptions.chainSS58 : false;
}

export function useIsMainnet() {
  const ss58 = useSS58Format();
  return ss58 == ss58formats[NETWORK_MAINNET];
}
