import { Dialog, Button, Intent } from "@blueprintjs/core";
import { useState, useCallback } from "react";
import { useApi } from "../Api";
import { signAndSend } from "../../utils/sign";
import keyring from "@polkadot/ui-keyring";
import useToaster from "../../hooks/useToaster";
import { useTranslation } from "react-i18next";

interface DialogUnvoteAllProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAccount: string;
}

export default function DialogUnvoteAll({ isOpen, onClose, selectedAccount }: DialogUnvoteAllProps) {
  const api = useApi();
  const toaster = useToaster();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleUnvote = useCallback(async () => {
    if (!api || !selectedAccount) return;
    setIsLoading(true);
    try {
      // Check if keyring is ready before getting pair
      if (keyring.getPairs().length === 0 && keyring.getAccounts().length === 0) {
        throw new Error("Keyring not ready");
      }
      const pair = keyring.getPair(selectedAccount);
      const isLocked = pair.isLocked && !pair.meta.isInjected;
      if (isLocked) {
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: t("messages.lbl_account_locked"),
        });
        setIsLoading(false);
        return;
      }
      const tx = api.tx.phragmenElection.removeVoter();
      await signAndSend(tx, pair, {}, ({ status }) => {
        if (!status.isInBlock) return;
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: t("governance.unvote_all_submitted", "Unvoted all successfully!"),
        });
        setIsLoading(false);
        onClose();
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: errorMessage,
      });
      setIsLoading(false);
    }
  }, [api, selectedAccount, toaster, t, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t("governance.unvote_all_btn", "Unvote All")}> 
      <div className="p-4 flex flex-col gap-4">
        <div>{t("governance.unvote_all_confirm", "Are you sure you want to remove all your votes?")}</div>
        <div className="flex justify-end mt-4 gap-2">
          <Button
            text={t('commons.cancel', 'Cancel')}
            onClick={onClose}
            disabled={isLoading}
          />
          <Button
            intent="danger"
            text={t("governance.unvote_all_btn", "Unvote All")}
            onClick={handleUnvote}
            loading={isLoading}
            disabled={isLoading || !selectedAccount}
          />
        </div>
      </div>
    </Dialog>
  );
} 