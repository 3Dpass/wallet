import { Button, Classes, Dialog, Intent } from "@blueprintjs/core";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";

import type { SignerOptions } from "@polkadot/api/types";
import { poolIdsAtom } from "../../atoms";
import { signAndSend } from "../../utils/sign";
import useToaster from "../../hooks/useToaster";
import useApi from "../Api";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogClosePool({ isOpen, onClose, pair }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [poolIds, setPoolIds] = useAtom(poolIdsAtom);

  function handleOnOpening() {
    setIsLoading(false);
  }

  useEffect(() => {
    setCanSubmit(api !== undefined);
  }, [api]);

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
      const tx = api.tx.miningPool.closePool();
      const options: Partial<SignerOptions> = {};
      const unsub = await signAndSend(tx, pair, options, ({ events = [], status, txHash }) => {
        if (!status.isFinalized) {
          return;
        }
        events.forEach(({ phase, event: { data, method, section } }) => {
          if (method == "ExtrinsicSuccess" && poolIds.includes(pair.address)) {
            poolIds;
            setPoolIds(
              poolIds.filter(function (item) {
                return item !== pair.address;
              })
            );
          }
        });
        unsub();
      });
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: "Mining Pool will be closed",
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
    <Dialog
      isOpen={isOpen}
      usePortal={true}
      onOpening={handleOnOpening}
      title="Close the mining pool"
      onClose={onClose}
      className="w-[90%] sm:w-[640px]"
    >
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose} text="Cancel" disabled={isLoading} />
          <Button
            intent={Intent.PRIMARY}
            disabled={isLoading || !canSubmit}
            onClick={handleSubmitClick}
            icon="remove"
            loading={isLoading}
            text="Close Pool"
          />
        </div>
      </div>
    </Dialog>
  );
}
