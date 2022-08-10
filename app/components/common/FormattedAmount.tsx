import { useAtomValue } from "jotai";
import { formatOptionsAtom } from "../../atoms";
import { formatBalance } from "@polkadot/util";

export function FormattedAmount({ value }) {
  const formatOptions = useAtomValue(formatOptionsAtom);
  if (!formatOptions) {
    return null;
  }
  return <>{formatBalance(value, formatOptions)}</>;
}
