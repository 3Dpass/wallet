import React, { useState } from "react";
import BaseDialog from "./BaseDialog";
import { NumericInput, InputGroup, Intent } from "@blueprintjs/core";
import { useApi } from "app/components/Api";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "app/atoms";
import keyring from "@polkadot/ui-keyring";
import { signAndSend } from "app/utils/sign";
import useToaster from "../../hooks/useToaster";
import { useTranslation } from "react-i18next";

interface DialogBurnAssetProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number;
}

export default function DialogBurnAsset({ isOpen, onClose, assetId }: DialogBurnAssetProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [who, setWho] = useState("");
  const [amount, setAmount] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the KeyringPair for the selected account
  const pair = (() => {
    try {
      if (selectedAccount && selectedAccount.trim() !== '') {
        return keyring.getPair(selectedAccount);
      }
      return null;
    } catch (error) {
      console.warn('Failed to get keyring pair:', error);
      return null;
    }
  })();

  const handleSubmit = async () => {
    setError(null);
    if (!api) return setError("API not ready");
    if (!selectedAccount || !who || amount === undefined || isNaN(amount) || amount <= 0) {
      setError(t("messages.lbl_fill_required_fields") || "Please fill all required fields.");
      return;
    }
    if (!pair) {
      setError(t("messages.lbl_no_account_selected") || "No account selected or unable to get keyring pair.");
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_account_locked") || "Account is locked."
      });
      return;
    }
    setLoading(true);
    try {
      // Compose the extrinsic
      const tx = api.tx.poscanAssets.burn(
        assetId,
        who,
        amount
      );
      await signAndSend(tx, pair, {}, ({ status }) => {
        if (!status.isInBlock) return;
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: t("dlg_asset.burn_success") || "Tokens burned successfully!"
        });
        onClose();
      });
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(errorMessage);
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("dlg_asset.burn_title") || "Burn Tokens"}
      primaryButton={{
        text: t("dlg_asset.burn_btn") || "Burn",
        icon: "remove",
        onClick: handleSubmit,
        intent: "primary",
        loading,
        disabled: loading,
      }}
    >
      <div className="flex flex-col gap-4">
        <InputGroup
          fill
          placeholder={t("dlg_asset.burn_who") || "Address to burn from"}
          value={who}
          onChange={e => setWho(e.target.value)}
          required
        />
        <NumericInput
          fill
          min={0}
          placeholder={t("dlg_asset.amount") || "Amount (min units)"}
          value={amount}
          onValueChange={v => setAmount(Number(v))}
          required
        />
        {/* No inline error or success messages, notifications only */}
      </div>
    </BaseDialog>
  );
} 