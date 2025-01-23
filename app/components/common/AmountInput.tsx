import { Button, NumericInput, Tag } from "@blueprintjs/core";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { formatOptionsAtom } from "../../atoms";

type AmountInputProps = {
	disabled?: boolean;
	onValueChange: (valueAsNumber: number, valueAsString: string) => void;
	placeholder?: string;
	unit?: string;
};

export default function AmountInput({
	disabled,
	onValueChange,
	placeholder,
	unit = "P3D",
}: AmountInputProps) {
	const [amount, setAmount] = useState("");
	const formatOptions = useAtomValue(formatOptionsAtom);

	function handleAmountChange(valueAsNumber: number, valueAsString: string) {
		setAmount(valueAsString);
		onValueChange(valueAsNumber, valueAsString);
	}

	return (
		<NumericInput
			disabled={disabled}
			selectAllOnFocus
			large
			buttonPosition={"none"}
			leftIcon="send-to"
			placeholder={placeholder || "Amount"}
			onValueChange={handleAmountChange}
			value={amount}
			fill
			min={0}
			minorStepSize={0.001}
			rightElement={
				<Button minimal disabled className="font-mono">
					{unit}
				</Button>
			}
		/>
	);
}
