import { Button, Checkbox, Classes, Dialog, Intent, NumericInput, Tag } from "@blueprintjs/core";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useEffect, useState } from "react";
import AmountInput from "../common/AmountInput";
import { signAndSend } from "../../utils/sign";
import useApi from "../../hooks/useApi";
import useToaster from "../../hooks/useToaster";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
  onAfterSubmit: () => void;
};

const autoExtendPeriod = 45000;

export default function DialogLockFunds({ pair, isOpen, onClose, onAfterSubmit }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dataInitial = {
    amount: "",
    amount_number: 0,
    block: "",
    block_number: 0,
    current_block: null,
    auto_extend: false,
  };
  const [data, setData] = useState(dataInitial);

  async function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
  }

  useEffect(() => {
    if (!isOpen || !api) {
      return;
    }

    async function load() {
      if (!api) {
        return;
      }
      const bestNumber = await api.derive.chain.bestNumber();
      const blockNumber = bestNumber.toJSON();
      setData((prev) => ({ ...prev, current_block: blockNumber, block: blockNumber + autoExtendPeriod, block_number: blockNumber + autoExtendPeriod }));
    }

    void load();
  }, [isOpen, api]);

  useEffect(() => {
    setCanSubmit(false);
    if (!isOpen || !api || data.current_block === null) {
      return;
    }
    setCanSubmit(data.amount_number > 0 && data.block_number >= data.current_block + autoExtendPeriod);
  }, [isOpen, api, data]);

  function handleAmountChange(valueAsNumber: number, valueAsString: string) {
    setData((prev) => ({ ...prev, amount: valueAsString, amount_number: valueAsNumber }));
  }

  function handleBlockChange(valueAsNumber: number, valueAsString: string) {
    setData((prev) => ({ ...prev, block: valueAsString, block_number: valueAsNumber }));
  }

  function handleAutoExtendChange() {
    setData((prev) => ({ ...prev, auto_extend: !prev.auto_extend }));
  }

  async function handleSubmitClick() {
    if (!api) {
      return;
    }
    setIsLoading(true);
    try {
      const value = BigInt(data.amount_number * 1_000_000_000_000);
      const tx = api.tx.validatorSet.lock(value, data.block_number, data.auto_extend ?? autoExtendPeriod);
      await signAndSend(tx, pair);
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: "Lock request is submitted",
      });
      onAfterSubmit();
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} usePortal={true} onClose={onClose} onOpening={handleOnOpening} className="w-[90%] sm:w-[640px]">
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        <AmountInput disabled={isLoading} onValueChange={handleAmountChange} />
        <NumericInput
          disabled={isLoading}
          buttonPosition={"none"}
          large={true}
          fill={true}
          placeholder="Release funds after this block"
          leftIcon="cube"
          onValueChange={handleBlockChange}
          value={data.block}
          rightElement={<Tag minimal={true}>Block Number</Tag>}
        />
        <Checkbox checked={data.auto_extend} large={true} onChange={handleAutoExtendChange}>
          Automatically extend each {autoExtendPeriod} blocks
        </Checkbox>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose} text="Cancel" disabled={isLoading} />
          <Button
            intent={Intent.PRIMARY}
            icon="lock"
            text="Lock funds"
            disabled={isLoading || !canSubmit}
            loading={isLoading}
            onClick={handleSubmitClick}
          />
        </div>
      </div>
    </Dialog>
  );
}
