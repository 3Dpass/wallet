import { formatBalance } from "@polkadot/util";
import { useAtomValue } from "jotai";
import { formatOptionsAtom } from "../../atoms";

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
		withUnit: unit || formatOptions.unit,
		decimals: decimals ?? formatOptions.decimals,
		withZero: false,
	};
	const formattedAmount = formatBalance(BigInt(value), options);
	return <>{formattedAmount}</>;
}
