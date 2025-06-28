import React, { useState, useCallback, useEffect } from "react";
import BaseDialog from "./BaseDialog";
import { InputGroup, Intent, Switch, Icon } from "@blueprintjs/core";
import { useApi } from "app/components/Api";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "app/atoms";
import keyring from "@polkadot/ui-keyring";
import { signAndSend } from "app/utils/sign";
import useToaster from "../../hooks/useToaster";
import { useTranslation } from "react-i18next";
import { isValidPolkadotAddress } from "../../utils/address";
import { AddressIcon } from "../common/AddressIcon";

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
  const [thawAsset, setThawAsset] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [isWhoValid, setIsWhoValid] = useState(false);

  // Memoized callbacks for JSX props
  const handleThawAssetToggle = useCallback(() => {
    setThawAsset(v => !v);
  }, []);

  const handleWhoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setWho(e.target.value);
  }, []);

  // Validate address whenever it changes
  useEffect(() => {
    setIsWhoValid(who.trim() === "" || isValidPolkadotAddress(who));
  }, [who]);

  // Update submit button state
  useEffect(() => {
    if (thawAsset) {
      // When thawing entire asset, no address validation needed
      setCanSubmit(api !== undefined);
    } else {
      // When thawing specific address, validate the address
      const addressValid = isWhoValid && who.trim() !== "";
      setCanSubmit(api !== undefined && addressValid);
    }
  }, [api, thawAsset, isWhoValid, who]);

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

  const handleSubmit = () => {
    if (!api) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "API not ready"
      });
      return;
    }
    if (!selectedAccount || (!thawAsset && !who)) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_fill_required_fields") || "Please fill all required fields."
      });
      return;
    }
    if (!thawAsset && !isWhoValid) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_invalid_address") || "Please enter a valid address."
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
      if (thawAsset) {
        tx = api.tx.poscanAssets.thawAsset(assetId);
      } else {
        tx = api.tx.poscanAssets.thaw(assetId, who);
      }
      signAndSend(tx, pair, {}, ({ status }) => {
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

  // Helper function to render address icon
  const renderAddressIcon = (address: string, isValid: boolean) => {
    if (address.trim() === "") {
      return <Icon icon="asterisk" />;
    }
    return isValid ? (
      <AddressIcon address={address} className="m-2" />
    ) : (
      <Icon icon="asterisk" />
    );
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
        disabled: loading || !canSubmit,
      }}
    >
      <div className="flex flex-col gap-4">
        <Switch
          checked={thawAsset}
          label={t("dlg_asset.thaw_asset_switch") || "Thaw entire asset"}
          onChange={handleThawAssetToggle}
        />
        {!thawAsset && (
          <InputGroup
            fill
            placeholder={t("dlg_asset.thaw_who") || "Address to thaw"}
            value={who}
            onChange={handleWhoChange}
            required
            leftElement={renderAddressIcon(who, isWhoValid)}
            className="font-mono"
            spellCheck={false}
          />
        )}
        {/* No inline error or success messages, notifications only */}
      </div>
    </BaseDialog>
  );
} 