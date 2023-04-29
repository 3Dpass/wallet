import { Button, Checkbox, Classes, Dialog, Intent } from "@blueprintjs/core";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";

import type { SignerOptions } from "@polkadot/api/types";
import { poolIdsAtom } from "../../atoms";
import { signAndSend, signAndSendWithSubscribtion } from "../../utils/sign";
import useApi from "../../hooks/useApi";
import useToaster from "../../hooks/useToaster";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogCreatePool({ isOpen, onClose, pair }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [poolIds, setPoolIds] = useAtom(poolIdsAtom);
  const [poolMode, setPoolMode] = useState(false);

  function handleOnOpening() {
    setIsLoading(false);
  }

  useEffect(() => {
    setCanSubmit(api !== undefined);
  }, [api]);

  async function sendSetPoolMode(poolMode: boolean) {
    if (!api) { return; }
    const tx = api.tx.miningPool.setPoolMode(poolMode);
    // await signAndSend(tx, pair, {});
    const unsub = await signAndSendWithSubscribtion(tx, pair, {}, ({ events = [], status, txHash }) => {
      console.log('status: ', status);
      if (!status.isFinalized) {
        return;
      }
      events.forEach(({ phase, event: { data, method, section } }) => {
        console.log('setPoolMode: ', method);
      });
      unsub();
    });
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
      const tx = api.tx.miningPool.createPool();
      const options: Partial<SignerOptions> = {};
      const unsub = await signAndSendWithSubscribtion(tx, pair, options, ({ events = [], status, txHash }) => {
        if (!status.isFinalized) {
          return;
        }
        events.forEach(({ phase, event: { data, method, section } }) => {
          if (method == 'ExtrinsicSuccess') {
            setPoolIds([pair.address, ...poolIds]);
            sendSetPoolMode(poolMode);
          }
        });
        unsub();
      });
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
      setIsLoading(false);
      onClose();
    }
  }

  return (
    <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} title="Create a new mining pool" onClose={onClose} className="w-[90%] sm:w-[640px]">
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
      <Checkbox checked={poolMode} large={false}
            className="bp4-control absolute"
            onChange={(e: any) => setPoolMode(e.target.checked)}>
            KYC mode
          </Checkbox>
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
