import { Button, Classes, Dialog, Intent } from "@blueprintjs/core";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";

import type { SignerOptions } from "@polkadot/api/types";
import { poolIdsAtom } from "../../atoms";
import { signAndSend } from "../../utils/sign";
import useToaster from "../../hooks/useToaster";
import { useApi } from "../Api";
import { useTranslation } from "react-i18next";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogClosePool({ isOpen, onClose, pair }: IProps) {
  const { t } = useTranslation();
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
        message: t("messages.lbl_account_locked"),
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
        message: t("messages.lbl_closing_mining_pool"),
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
      title={t("dlg_close_pool.lbl_title")}
      onClose={onClose}
      className="w-[90%] sm:w-[640px]"
    >
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose} text={t("commons.lbl_btn_cancel")} disabled={isLoading} />
          <Button
            intent={Intent.PRIMARY}
            disabled={isLoading || !canSubmit}
            onClick={handleSubmitClick}
            icon="remove"
            loading={isLoading}
            text={t("dlg_close_pool.lbl_btn_close_pool")}
          />
        </div>
      </div>
    </Dialog>
  );
}
