import React, { useState } from "react";
import BaseDialog from "./BaseDialog";
import { InputGroup, Intent, Switch } from "@blueprintjs/core";
import { useApi } from "app/components/Api";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "app/atoms";
import keyring from "@polkadot/ui-keyring";
import { signAndSend } from "app/utils/sign";
import useToaster from "../../hooks/useToaster";
import { useTranslation } from "react-i18next";

interface DialogThawAssetProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number;
}

export default function DialogThawAsset({ isOpen, onClose, assetId }: DialogThawAssetProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [who, setWho] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thawAsset, setThawAsset] = useState(false);

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
    if (!selectedAccount || (!thawAsset && !who)) {
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
      let tx;
      if (thawAsset) {
        tx = api.tx.poscanAssets.thawAsset(assetId);
      } else {
        tx = api.tx.poscanAssets.thaw(assetId, who);
      }
      await signAndSend(tx, pair, {}, ({ status }) => {
        if (!status.isInBlock) return;
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: thawAsset
            ? t("dlg_asset.thaw_asset_success") || "Asset thawed successfully!"
            : t("dlg_asset.thaw_success") || "Tokens thawed successfully!"
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
      title={t("dlg_asset.thaw_title") || "Thaw"}
      primaryButton={{
        text: thawAsset ? (t("dlg_asset.thaw_asset_btn") || "Thaw Asset") : (t("dlg_asset.thaw_btn") || "Thaw"),
        icon: "unlock",
        onClick: handleSubmit,
        intent: "primary",
        loading,
        disabled: loading,
      }}
    >
      <div className="flex flex-col gap-4">
        <Switch
          checked={thawAsset}
          label={t("dlg_asset.thaw_asset_switch") || "Thaw entire asset"}
          onChange={() => setThawAsset(v => !v)}
        />
        {!thawAsset && (
          <InputGroup
            fill
            placeholder={t("dlg_asset.thaw_who") || "Address to thaw"}
            value={who}
            onChange={e => setWho(e.target.value)}
            required
          />
        )}
        {/* No inline error or success messages, notifications only */}
      </div>
    </BaseDialog>
  );
} 