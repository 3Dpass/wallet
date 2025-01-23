import { formatBalance } from "@polkadot/util";
import { useAtomValue } from "jotai";
import { formatOptionsAtom } from "../../atoms";

type FormattedAmountProps = {
	value: number | bigint;
	decimals?: number;
	unit?: string;
	withUnit?: boolean;
};

export function FormattedAmount({
	value,
	decimals,
	unit,
	withUnit = true,
}: FormattedAmountProps) {
	const formatOptions = useAtomValue(formatOptionsAtom);
	if (!formatOptions) {
		return null;
	}
	const options = {
		withUnit: withUnit && (unit || formatOptions.unit),
		decimals: decimals ?? formatOptions.decimals,
		withZero: false,
	};
	const formattedAmount = formatBalance(BigInt(value), options);
	const [amount, actualUnit] = formattedAmount.split(" ");
	return (
		<>
			<span className="mr-[3px]">{amount}</span>
			<span className="text-gray-400">{actualUnit}</span>
		</>
	);
}
