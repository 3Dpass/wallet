import React, { useState, useCallback, useEffect } from "react";
import BaseDialog from "./BaseDialog";
import { NumericInput, InputGroup, Intent, Icon } from "@blueprintjs/core";
import { useApi } from "app/components/Api";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "app/atoms";
import keyring from "@polkadot/ui-keyring";
import { signAndSend } from "app/utils/sign";
import useToaster from "../../hooks/useToaster";
import { useTranslation } from "react-i18next";
import { isValidPolkadotAddress } from "../../utils/address";
import { AddressIcon } from "../common/AddressIcon";

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
  const [canSubmit, setCanSubmit] = useState(false);
  const [isWhoValid, setIsWhoValid] = useState(false);

  // Memoized callbacks for event handlers
  const handleWhoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setWho(e.target.value);
  }, []);

  const handleAmountChange = useCallback((v: number | string) => {
    setAmount(Number(v));
  }, []);

  // Validate address whenever it changes
  useEffect(() => {
    setIsWhoValid(who.trim() === "" || isValidPolkadotAddress(who));
  }, [who]);

  // Update submit button state
  useEffect(() => {
    const addressValid = isWhoValid && who.trim() !== "";
    const amountValid = amount !== undefined && !isNaN(amount) && amount > 0;
    setCanSubmit(api !== undefined && addressValid && amountValid);
  }, [api, isWhoValid, who, amount]);

  const handleSignAndSendCallback = useCallback(({ status }: { status: { isInBlock: boolean } }) => {
    if (!status.isInBlock) return;
    toaster.show({
      icon: "endorsed",
      intent: Intent.SUCCESS,
      message: t("dlg_asset.burn_success") || "Tokens burned successfully!"
    });
    onClose();
  }, [toaster, t, onClose]);

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
    if (!selectedAccount || !who || amount === undefined || isNaN(amount) || amount <= 0) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_fill_required_fields") || "Please fill all required fields."
      });
      return;
    }
    if (!isWhoValid) {
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
      // Compose the extrinsic
      const tx = api.tx.poscanAssets.burn(
        assetId,
        who,
        amount
      );
      signAndSend(tx, pair, {}, handleSignAndSendCallback);
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
      title={t("dlg_asset.burn_title") || "Burn Tokens"}
      primaryButton={{
        text: t("dlg_asset.burn_btn") || "Burn",
        icon: "remove",
        onClick: handleSubmit,
        intent: "primary",
        loading,
        disabled: loading || !canSubmit,
      }}
    >
      <div className="flex flex-col gap-4">
        <InputGroup
          fill
          placeholder={t("dlg_asset.burn_who") || "Address to burn from"}
          value={who}
          onChange={handleWhoChange}
          required
          leftElement={renderAddressIcon(who, isWhoValid)}
          className="font-mono"
          spellCheck={false}
        />
        <NumericInput
          fill
          min={0}
          placeholder={t("dlg_asset.amount") || "Amount (min units)"}
          value={amount}
          onValueChange={handleAmountChange}
          required
        />
        {/* No inline error or success messages, notifications only */}
      </div>
    </BaseDialog>
  );
} 