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

interface DialogSetAssetMetadataProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number;
}

export default function DialogSetAssetMetadata({ isOpen, onClose, assetId }: DialogSetAssetMetadataProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState<number | undefined>();
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
    if (!selectedAccount || !name || !symbol || decimals === undefined) {
      setError(t("messages.lbl_fill_required_fields") || "Please fill all required fields.");
      return;
    }
    if (!pair) {
      setError(t("messages.lbl_no_account_selected") || "No account selected or unable to get keyring pair.");
      return;
    }
    if (decimals < 0 || decimals > 18) {
      setError(t("dlg_asset.invalid_decimals") || "Decimals must be between 0 and 18.");
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
      const tx = api.tx.poscanAssets.setMetadata(
        assetId,
        name,
        symbol,
        decimals
      );
      await signAndSend(tx, pair, {}, ({ status }) => {
        if (!status.isInBlock) return;
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: t("dlg_asset.metadata_set_success") || "Metadata set successfully!"
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
      title={t("dlg_asset.set_metadata_title") || "Set Asset Metadata"}
      primaryButton={{
        text: t("dlg_asset.set_metadata_btn") || "Set Metadata",
        icon: "edit",
        onClick: handleSubmit,
        intent: "primary",
        loading,
        disabled: loading,
      }}
    >
      <div className="flex flex-col gap-4">
        <InputGroup
          fill
          placeholder={t("dlg_asset.asset_name") || "Asset Name"}
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <InputGroup
          fill
          placeholder={t("dlg_asset.asset_symbol") || "Symbol"}
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          required
        />
        <NumericInput
          fill
          min={0}
          max={18}
          placeholder={t("dlg_asset.asset_decimals") || "Decimals (0-18)"}
          value={decimals}
          onValueChange={v => setDecimals(Number(v))}
          required
        />
        {/* No inline error or success messages, notifications only */}
      </div>
    </BaseDialog>
  );
} 