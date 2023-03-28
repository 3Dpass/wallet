import { useAtomValue } from "jotai";
import { formatOptionsAtom } from "../atoms";

export function useSS58Format(): number | false {
  const formatOptions = useAtomValue(formatOptionsAtom);
  return formatOptions ? formatOptions.chainSS58 : false;
}
