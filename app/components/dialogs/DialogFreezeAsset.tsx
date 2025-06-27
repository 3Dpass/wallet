import React, { useState, useCallback } from "react";
import BaseDialog from "./BaseDialog";
import { InputGroup, Intent, Switch } from "@blueprintjs/core";
import { useApi } from "app/components/Api";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "app/atoms";
import keyring from "@polkadot/ui-keyring";
import { signAndSend } from "app/utils/sign";
import useToaster from "../../hooks/useToaster";
import { useTranslation } from "react-i18next";
import type { SubmittableResult } from "@polkadot/api";

interface DialogFreezeAssetProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number;
}

export default function DialogFreezeAsset({ isOpen, onClose, assetId }: DialogFreezeAssetProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [who, setWho] = useState("");
  const [loading, setLoading] = useState(false);
  const [freezeAsset, setFreezeAsset] = useState(false);

  // Memoized callbacks for JSX props
  const handleFreezeAssetToggle = useCallback(() => {
    setFreezeAsset(prev => !prev);
  }, []);

  const handleWhoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setWho(e.target.value);
  }, []);

  const handleSignAndSendCallback = useCallback((result: SubmittableResult) => {
    if (!result.isInBlock) return;
    toaster.show({
      icon: "endorsed",
      intent: Intent.SUCCESS,
      message: freezeAsset
        ? t("dlg_asset.freeze_asset_success") || "Asset frozen successfully!"
        : t("dlg_asset.freeze_success") || "Tokens frozen successfully!"
    });
    onClose();
  }, [toaster, t, freezeAsset, onClose]);

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
    if (!api) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "API not ready"
      });
      return;
    }
    if (!selectedAccount || (!freezeAsset && !who)) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_fill_required_fields") || "Please fill all required fields."
      });
      return;
    }
    if (!pair) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_no_account_selected") || "No account selected or unable to get keyring pair."
      });
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
      if (freezeAsset) {
        tx = api.tx.poscanAssets.freezeAsset(assetId);
      } else {
        tx = api.tx.poscanAssets.freeze(assetId, who);
      }
      await signAndSend(tx, pair, {}, handleSignAndSendCallback);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
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
      title={t("dlg_asset.freeze_title") || "Freeze"}
      primaryButton={{
        text: freezeAsset ? (t("dlg_asset.freeze_asset_btn") || "Freeze Asset") : (t("dlg_asset.freeze_btn") || "Freeze"),
        icon: "snowflake",
        onClick: handleSubmit,
        intent: "primary",
        loading,
        disabled: loading,
      }}
    >
      <div className="flex flex-col gap-4">
        <Switch
          checked={freezeAsset}
          label={t("dlg_asset.freeze_asset_switch") || "Freeze entire asset"}
          onChange={handleFreezeAssetToggle}
        />
        {!freezeAsset && (
          <InputGroup
            fill
            placeholder={t("dlg_asset.freeze_who") || "Address to freeze"}
            value={who}
            onChange={handleWhoChange}
            required
          />
        )}
        {/* No inline error or success messages, notifications only */}
      </div>
    </BaseDialog>
  );
} 