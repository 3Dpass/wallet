import { Button, Classes, Dialog, Intent, NumericInput } from "@blueprintjs/core";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";

import type { SignerOptions } from "@polkadot/api/types";
import { signAndSend } from "../../utils/sign";
import useApi from "../../hooks/useApi";
import useToaster from "../../hooks/useToaster";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogSetPoolDifficulty({ isOpen, onClose, pair }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dataInitial = {
    difficulty: 0,
  };
  const [data, setData] = useState(dataInitial);

  function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
  }

  useEffect(() => {
    setCanSubmit(api !== undefined);
  }, [api, {}]);

  function handleDifficultyChange(valueAsNumber: number) {
    if (!isNaN(valueAsNumber)) {
      setData((prev) => ({ ...prev, difficulty: valueAsNumber }));
    }
  }

  async function handleSubmitClick() {
    if (!api) {
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "Account is locked",
      });
      return;
    }
    setIsLoading(true);
    try {
      const tx = api.tx.miningPool.setPoolDifficulty(data.difficulty);
      const options: Partial<SignerOptions> = {};
      await signAndSend(tx, pair, options);
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: "Pool difficulty was set",
      });
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
    } finally {
      setIsLoading(false);
      onClose();
    }
  }

  return (
    <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} title="Set pool difficulty" onClose={onClose} className="w-[90%] sm:w-[640px]">
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        <NumericInput
          disabled={isLoading}
          buttonPosition={"none"}
          large={true}
          fill={true}
          placeholder="Pool difficulty"
          onValueChange={handleDifficultyChange}
          value={data.difficulty}
        />
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose} text="Cancel" disabled={isLoading} />
          <Button
            intent={Intent.PRIMARY}
            disabled={isLoading || !canSubmit}
            onClick={handleSubmitClick}
            icon="arrow-right"
            loading={isLoading}
            text="Set difficulty"
          />
        </div>
      </div>
    </Dialog>
  );
}
