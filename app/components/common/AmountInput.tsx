import { useAtomValue } from "jotai";
import { apiAtom } from "../../atoms";
import { useEffect, useState } from "react";
import { NumericInput, Tag } from "@blueprintjs/core";

type IProps = {
  disabled: boolean;
  onValueChange: (valueAsNumber: number, valueAsString: string) => void;
  placeholder?: string;
};

export default function AmountInput({ disabled, onValueChange, placeholder }: IProps) {
  const api = useAtomValue(apiAtom);
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    api && setTokenSymbol(api.registry.getChainProperties().tokenSymbol.toHuman().toString());
  }, [api]);

  function handleAmountChange(valueAsNumber, valueAsString) {
    setAmount(valueAsString);
    onValueChange(valueAsNumber, valueAsString);
  }

  return (
    <NumericInput
      disabled={disabled}
      selectAllOnFocus={true}
      buttonPosition={null}
      large={true}
      leftIcon="send-to"
      placeholder={placeholder || "Amount"}
      onValueChange={handleAmountChange}
      value={amount}
      fill={true}
      min={0}
      minorStepSize={0.001}
      rightElement={<Tag minimal={true}>{tokenSymbol}</Tag>}
    />
  );
}
