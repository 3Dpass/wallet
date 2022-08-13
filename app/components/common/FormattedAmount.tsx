import { useAtomValue } from "jotai";
import { formatOptionsAtom } from "../../atoms";
import { formatBalance } from "@polkadot/util";

export function FormattedAmount({ value }) {
  const formatOptions = useAtomValue(formatOptionsAtom);
  if (!formatOptions) {
    return null;
  }
  const bigIntValue = BigInt(value);
  const formattedAmount = formatBalance(bigIntValue, formatOptions);
  return <>{formattedAmount}</>;
}
