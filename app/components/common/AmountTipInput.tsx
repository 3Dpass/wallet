import { useAtomValue } from "jotai";
import { apiAtom } from "../../atoms";
import { useEffect, useState } from "react";
import { NumericInput, Tag } from "@blueprintjs/core";

type IProps = {
  disabled: boolean;
  onValueChange: (valueAsNumber: number, valueAsString: string) => void;
};

export default function AmountTipInput({ disabled, onValueChange }: IProps) {
  const api = useAtomValue(apiAtom);
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tip, setTip] = useState("");

  useEffect(() => {
    api && setTokenSymbol(api.registry.getChainProperties().tokenSymbol.toHuman().toString());
  }, [api]);

  function handleTipsChange(valueAsNumber, valueAsString) {
    setTip(valueAsString);
    onValueChange(valueAsNumber, valueAsString);
  }

  return (
    <NumericInput
      disabled={disabled}
      selectAllOnFocus={true}
      buttonPosition={null}
      className="mb-2"
      large={true}
      leftIcon="send-to"
      placeholder="Enter optional tips to increase transaction priority"
      onValueChange={handleTipsChange}
      value={tip}
      fill={true}
      min={0}
      minorStepSize={0.001}
      rightElement={<Tag minimal={true}>{tokenSymbol}</Tag>}
    />
  );
}
