import { NETWORK_MAINNET, ss58formats } from "../api.config";
import { useSS58Format } from "./useSS58Format";

export function useIsMainnet() {
  const ss58 = useSS58Format();
  return ss58 == ss58formats[NETWORK_MAINNET];
}
