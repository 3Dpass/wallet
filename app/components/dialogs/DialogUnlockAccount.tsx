import { Icon, InputGroup, Intent } from "@blueprintjs/core";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import BaseDialog from "./BaseDialog";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogUnlockAccount({ pair, isOpen, onClose }: IProps) {
  const { t } = useTranslation();
  const toaster = useToaster();
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);

  function handleOnOpening() {
    setPassphrase("");
    setLoading(false);
  }

  const handleSendClick = useCallback(async () => {
    setLoading(true);
    try {
      await pair.unlock(passphrase);
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: t("messages.lbl_account_locked"),
      });
      onClose();
    } catch (e: unknown) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e instanceof Error ? e.message : "Unknown error",
      });
      setLoading(false);
    }
  }, [pair, passphrase, onClose, toaster, t]);

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      onOpening={handleOnOpening}
      title={t("dlg_unlock_account.lbl_title")}
      primaryButton={{
        intent: Intent.PRIMARY,
        onClick: handleSendClick,
        text: t("dlg_unlock_account.lbl_btn_unlock"),
        loading,
      }}
    >
      <InputGroup
        type="password"
        large
        className="font-mono"
        spellCheck={false}
        placeholder={t("commons.lbl_passphrase")}
        onChange={(e) => setPassphrase(e.target.value)}
        value={passphrase}
        leftElement={<Icon icon="lock" />}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            void handleSendClick();
          }
        }}
      />
    </BaseDialog>
  );
}
