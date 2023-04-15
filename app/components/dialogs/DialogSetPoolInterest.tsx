import { Button, Classes, Dialog, Intent, NumericInput } from "@blueprintjs/core";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";

import type { SignerOptions } from "@polkadot/api/types";
import { miningPoolAtom } from "../../atoms";
import { signAndSend } from "../../utils/sign";
import useApi from "../../hooks/useApi";
import useToaster from "../../hooks/useToaster";
import InterestInput from "../common/InterestInput";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogSetPoolInterest({ isOpen, onClose, pair }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [miningPool, setMiningPool] = useAtom(miningPoolAtom);
  const dataInitial = {
    mining_pool: miningPool,
    interest: 0,
  };
  const [data, setData] = useState(dataInitial);

  function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
  }

  useEffect(() => {
    setCanSubmit(api !== undefined);
  }, [api, {}]);

  function handleInterestChange(valueAsNumber: number) {
    setData((prev) => ({ ...prev, interest: valueAsNumber }));
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
      const tx = api.tx.miningPool.setPoolInterest(data.interest);
      const options: Partial<SignerOptions> = {};
      const res = await signAndSend(tx, pair, options);
      console.log(res);
      setData((prev) => ({ ...prev, mining_pool: res }))
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: "Mining Pool has been created",
      });
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
    } finally {
      setMiningPool(data.mining_pool);
      setIsLoading(false);
      onClose();
    }
  }

  return (
    <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} title="Create a new mining pool" onClose={onClose} className="w-[90%] sm:w-[640px]">
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        <InterestInput disabled={isLoading} onValueChange={handleInterestChange} placeholder="percent" />
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose} text="Cancel" disabled={isLoading} />
          <Button
            intent={Intent.PRIMARY}
            disabled={isLoading || !canSubmit}
            onClick={handleSubmitClick}
            icon="add"
            loading={isLoading}
            text="Create Pool"
          />
        </div>
      </div>
    </Dialog>
  );
}
