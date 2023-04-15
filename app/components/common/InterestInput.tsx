import { useState } from "react";
import { NumericInput } from "@blueprintjs/core";

type IProps = {
  disabled: boolean;
  onValueChange: (valueAsNumber: number, valueAsString: string) => void;
  placeholder?: string;
};

export default function InterestInput({ disabled, onValueChange, placeholder }: IProps) {
  const [amount, setAmount] = useState("");

  function handleInterestChange(valueAsNumber: number, valueAsString: string) {
    setAmount(valueAsString);
    onValueChange(valueAsNumber, valueAsString);
  }

  return (
    <NumericInput
      disabled={disabled}
      selectAllOnFocus={true}
      large={true}
      buttonPosition={"none"}
      placeholder={placeholder || "Interest"}
      onValueChange={handleInterestChange}
      value={amount}
      fill={true}
      max={100}
      min={0}
      minorStepSize={0.001}
      clampValueOnBlur={true}
    />
  );
}
