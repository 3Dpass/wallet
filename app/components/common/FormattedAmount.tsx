import { useAtomValue } from "jotai";
import { formatOptionsAtom } from "../../atoms";
import { formatBalance } from "@polkadot/util";

export function FormattedAmount({ value }: { value: number | bigint }) {
  const formatOptions = useAtomValue(formatOptionsAtom);
  if (!formatOptions) {
    return null;
  }
  const options = {
    withUnit: formatOptions.unit,
    decimals: formatOptions.decimals,
    withSi: true,
  };
  const formattedAmount = formatBalance(BigInt(value), options);
  return <>{formattedAmount}</>;
}
