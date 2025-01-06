import { useAtomValue } from "jotai";
import { formatOptionsAtom } from "../../atoms";
import { formatBalance } from "@polkadot/util";

function trimTrailingZeros(value: string): string {
  // Remove trailing zeros after decimal point, and the decimal point itself if no decimals left
  return value.replace(/\.?0+$/, "");
}

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
  // Split the amount and unit to handle them separately
  const [amount, unit] = formattedAmount.split(" ");
  const cleanAmount = trimTrailingZeros(amount);
  return (
    <>
      {cleanAmount}
      {unit ? ` ${unit}` : ""}
    </>
  );
}
