import { Icon, InputGroup, Intent, NumericInput } from "@blueprintjs/core";
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

interface DialogForceTransferProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number;
}

export default function DialogForceTransfer({
  isOpen,
  onClose,
  assetId,
}: DialogForceTransferProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [source, setSource] = useState("");
  const [dest, setDest] = useState("");
  const [amount, setAmount] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [isSourceValid, setIsSourceValid] = useState(false);
  const [isDestValid, setIsDestValid] = useState(false);

  // Memoized callbacks for event handlers
  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSource(e.target.value);
    },
    []
  );

  const handleDestChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDest(e.target.value);
    },
    []
  );

  const handleAmountChange = useCallback((value: number | string) => {
    setAmount(Number(value));
  }, []);

  // Validate addresses whenever they change
  useEffect(() => {
    setIsSourceValid(source.trim() === "" || isValidPolkadotAddress(source));
    setIsDestValid(dest.trim() === "" || isValidPolkadotAddress(dest));
  }, [source, dest]);

  // Update submit button state
  useEffect(() => {
    const sourceValid = isSourceValid && source.trim() !== "";
    const destValid = isDestValid && dest.trim() !== "";
    const amountValid =
      amount !== undefined && !Number.isNaN(amount) && amount > 0;
    setCanSubmit(api !== undefined && sourceValid && destValid && amountValid);
  }, [api, isSourceValid, isDestValid, source, dest, amount]);

  const handleSignAndSendCallback = useCallback(
    ({ status }: { status: { isInBlock: boolean } }) => {
      if (!status.isInBlock) return;
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message:
          t("dlg_asset.force_transfer_success") || "Force transfer successful!",
      });
      onClose();
    },
    [toaster, t, onClose]
  );

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
    if (
      !selectedAccount ||
      !source ||
      !dest ||
      amount === undefined ||
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message:
          t("messages.lbl_fill_required_fields") ||
          "Please fill all required fields.",
      });
      return;
    }
    if (!isSourceValid || !isDestValid) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message:
          t("messages.lbl_invalid_address") || "Please enter valid addresses.",
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
      const tx = api.tx.poscanAssets.forceTransfer(
        assetId,
        source,
        dest,
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
      title={t("dlg_asset.force_transfer_title") || "Force Transfer"}
      primaryButton={{
        text: t("dlg_asset.force_transfer_btn") || "Force Transfer",
        icon: "swap-horizontal",
        onClick: handleSubmit,
        intent: "primary",
        loading,
        disabled: loading || !canSubmit,
      }}
    >
      <div className="flex flex-col gap-4">
        <InputGroup
          fill
          placeholder={t("dlg_asset.force_transfer_source") || "Source address"}
          value={source}
          onChange={handleSourceChange}
          required
          leftElement={renderAddressIcon(source, isSourceValid)}
          className="font-mono"
          spellCheck={false}
        />
        <InputGroup
          fill
          placeholder={
            t("dlg_asset.force_transfer_dest") || "Destination address"
          }
          value={dest}
          onChange={handleDestChange}
          required
          leftElement={renderAddressIcon(dest, isDestValid)}
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
