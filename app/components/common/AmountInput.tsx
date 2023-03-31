import { useState } from "react";
import { NumericInput, Tag } from "@blueprintjs/core";
import { formatOptionsAtom } from "../../atoms";
import { useAtomValue } from "jotai";

type IProps = {
  disabled: boolean;
  onValueChange: (valueAsNumber: number, valueAsString: string) => void;
  placeholder?: string;
};

export default function AmountInput({ disabled, onValueChange, placeholder }: IProps) {
  const [amount, setAmount] = useState("");
  const formatOptions = useAtomValue(formatOptionsAtom);

  function handleAmountChange(valueAsNumber: number, valueAsString: string) {
    setAmount(valueAsString);
    onValueChange(valueAsNumber, valueAsString);
  }

  return (
    <NumericInput
      disabled={disabled}
      selectAllOnFocus={true}
      large={true}
      buttonPosition={"none"}
      leftIcon="send-to"
      placeholder={placeholder || "Amount"}
      onValueChange={handleAmountChange}
      value={amount}
      fill={true}
      min={0}
      minorStepSize={0.001}
      rightElement={<Tag minimal={true}>{formatOptions && formatOptions.unit}</Tag>}
    />
  );
}
