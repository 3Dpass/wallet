import { formatBalance } from "@polkadot/util";
import { useAtomValue } from "jotai";
import { formatOptionsAtom } from "../../atoms";

function trimTrailingZeros(value: string): string {
	// Remove trailing zeros after decimal point, and the decimal point itself if no decimals left
	return value.replace(/\.?0+$/, "");
}

type FormattedAmountProps = {
	value: number | bigint;
	decimals?: number;
	unit?: string;
};

export function FormattedAmount({
	value,
	decimals,
	unit,
}: FormattedAmountProps) {
	const formatOptions = useAtomValue(formatOptionsAtom);
	if (!formatOptions) {
		return null;
	}
	const options = {
		withUnit: Boolean(unit) || formatOptions.unit,
		decimals: decimals ?? formatOptions.decimals,
		withSi: true,
		unit: unit,
	};
	const formattedAmount = formatBalance(BigInt(value), options);
	// Split the amount and unit to handle them separately
	const [amount, displayUnit] = formattedAmount.split(" ");
	const cleanAmount = trimTrailingZeros(amount);
	return (
		<>
			{cleanAmount}
			{displayUnit ? ` ${unit || displayUnit}` : ""}
		</>
	);
}
