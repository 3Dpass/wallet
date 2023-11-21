import { useState } from "react";
import { NumericInput, Tag } from "@blueprintjs/core";
import { formatOptionsAtom } from "../../atoms";
import { useAtomValue } from "jotai";

type IProps = {
  disabled: boolean;
  onValueChange: (valueAsNumber: number, valueAsString: string) => void;
  placeholder?: string;
  formatOptionsUnit?: string | null;
};

export default function AmountInput({ disabled, onValueChange, placeholder, formatOptionsUnit }: IProps) {
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
      rightElement={<Tag minimal>{formatOptionsUnit || (formatOptions?.unit)}</Tag>}
    />
  );
}
