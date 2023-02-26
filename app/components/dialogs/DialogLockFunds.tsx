import { Button, Classes, Dialog, Intent, NumericInput, Tag } from "@blueprintjs/core";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useEffect, useState } from "react";
import AmountInput from "../common/AmountInput";
import { useAtomValue } from "jotai";
import { apiAtom, toasterAtom } from "../../atoms";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
  onAfterSubmit: () => void;
};

export default function DialogLockFunds({ pair, isOpen, onClose, onAfterSubmit }: IProps) {
  const api = useAtomValue(apiAtom);
  const toaster = useAtomValue(toasterAtom);
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dataInitial = {
    amount: "",
    amount_number: 0,
    block: "",
    block_number: 0,
    current_block: null,
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
      setData((prev) => ({ ...prev, current_block: blockNumber, block: blockNumber + 1, block_number: blockNumber + 1 }));
    }

    load().then();
  }, [isOpen, api]);

  useEffect(() => {
    setCanSubmit(false);
    if (!isOpen || !api) {
      return;
    }
    setCanSubmit(data.amount_number > 0 && data.block_number > data.current_block);
  }, [isOpen, api, data]);

  function handleAmountChange(valueAsNumber, valueAsString) {
    setData((prev) => ({ ...prev, amount: valueAsString, amount_number: valueAsNumber }));
  }

  function handleBlockChange(valueAsNumber, valueAsString) {
    setData((prev) => ({ ...prev, block: valueAsString, block_number: valueAsNumber }));
  }

  async function handleSubmitClick() {
    if (!api || pair.isLocked) {
      return;
    }
    setIsLoading(true);
    try {
      const value = BigInt(data.amount_number * 1_000_000_000_000);
      await api.tx.rewards.lock(value, data.block_number).signAndSend(pair);
      toaster &&
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: "Lock request is submitted",
        });
      onAfterSubmit();
    } catch (e) {
      toaster &&
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
      <div className={Classes.DIALOG_BODY}>
        <AmountInput disabled={isLoading} onValueChange={handleAmountChange} />
        <NumericInput
          disabled={isLoading}
          buttonPosition={null}
          large={true}
          fill={true}
          placeholder="Release funds after this block"
          leftIcon="cube"
          onValueChange={handleBlockChange}
          value={data.block}
          rightElement={<Tag minimal={true}>Block Number</Tag>}
        />
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
