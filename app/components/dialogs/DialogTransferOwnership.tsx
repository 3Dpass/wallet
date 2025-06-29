import { Icon, InputGroup, Intent } from "@blueprintjs/core";
import keyring from "@polkadot/ui-keyring";
import { lastSelectedAccountAtom } from "app/atoms";
import { useApi } from "app/components/Api";
import { signAndSend } from "app/utils/sign";
import { useAtom } from "jotai";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import { isValidPolkadotAddress } from "../../utils/address";
import { AddressIcon } from "../common/AddressIcon";
import BaseDialog from "./BaseDialog";

interface DialogTransferOwnershipProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number;
}

export default function DialogTransferOwnership({
  isOpen,
  onClose,
  assetId,
}: DialogTransferOwnershipProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [newOwner, setNewOwner] = useState("");
  const [loading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [isNewOwnerValid, setIsNewOwnerValid] = useState(false);

  // Memoized callback for handling new owner input changes
  const handleNewOwnerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewOwner(e.target.value);
    },
    []
  );

  // Validate address whenever it changes
  useEffect(() => {
    setIsNewOwnerValid(
      newOwner.trim() === "" || isValidPolkadotAddress(newOwner)
    );
  }, [newOwner]);

  // Update submit button state
  useEffect(() => {
    const addressValid = isNewOwnerValid && newOwner.trim() !== "";
    setCanSubmit(api !== undefined && addressValid);
  }, [api, isNewOwnerValid, newOwner]);

  // Get the KeyringPair for the selected account
  const pair = (() => {
    try {
      if (selectedAccount && selectedAccount.trim() !== "") {
        return keyring.getPair(selectedAccount);
      }
      return null;
    } catch (error) {
      console.warn("Failed to get keyring pair:", error);
      return null;
    }
  })();

  const handleSubmit = () => {
    if (!api) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "API not ready",
      });
      return;
    }
    if (!selectedAccount || !newOwner) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message:
          t("messages.lbl_fill_required_fields") ||
          "Please fill all required fields.",
      });
      return;
    }
    if (!isNewOwnerValid) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message:
          t("messages.lbl_invalid_address") || "Please enter a valid address.",
      });
      return;
    }
    if (!pair) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message:
          t("messages.lbl_no_account_selected") ||
          "No account selected or unable to get keyring pair.",
      });
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_account_locked") || "Account is locked.",
      });
      return;
    }
    setLoading(true);
    try {
      // Compose the extrinsic
      const tx = api.tx.poscanAssets.transferOwnership(assetId, newOwner);
      signAndSend(tx, pair, {}, ({ status }) => {
        if (!status.isInBlock) return;
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message:
            t("dlg_asset.transfer_ownership_success") ||
            "Ownership transferred successfully!",
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
    return;
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
      title={t("dlg_asset.transfer_ownership_title") || "Transfer Ownership"}
      primaryButton={{
        text: t("dlg_asset.transfer_ownership_btn") || "Transfer",
        icon: "exchange",
        onClick: handleSubmit,
        intent: "primary",
        loading,
        disabled: loading || !canSubmit,
      }}
    >
      <div className="flex flex-col gap-4">
        <InputGroup
          fill
          placeholder={
            t("dlg_asset.transfer_ownership_new_owner") || "New owner address"
          }
          value={newOwner}
          onChange={handleNewOwnerChange}
          required
          leftElement={renderAddressIcon(newOwner, isNewOwnerValid)}
          className="font-mono"
          spellCheck={false}
        />
        {/* No inline error or success messages, notifications only */}
      </div>
    </BaseDialog>
  );
}
