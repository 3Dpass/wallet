import { Intent, NumericInput } from "@blueprintjs/core";
import keyring from "@polkadot/ui-keyring";
import { lastSelectedAccountAtom } from "app/atoms";
import { useApi } from "app/components/Api";
import { signAndSend } from "app/utils/sign";
import { useAtom } from "jotai";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import BaseDialog from "./BaseDialog";

interface DialogMintAssetProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number;
}

export default function DialogMintAsset({
  isOpen,
  onClose,
  assetId,
}: DialogMintAssetProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [amount, setAmount] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  // Memoized callback for handling amount input changes
  const handleAmountChange = useCallback((v: number) => {
    setAmount(Number(v));
  }, []);

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
      amount === undefined ||
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message:
          t("messages.lbl_fill_required_fields") ||
          "Please enter a valid amount.",
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
      const tx = api.tx.poscanAssets.mint(assetId, amount);
      signAndSend(tx, pair, {}, ({ status }) => {
        if (!status.isInBlock) return;
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: t("dlg_asset.mint_success") || "Tokens minted successfully!",
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

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("dlg_asset.mint_title") || "Mint Tokens"}
      primaryButton={{
        text: t("dlg_asset.mint_btn") || "Mint",
        icon: "add",
        onClick: handleSubmit,
        intent: "primary",
        loading,
        disabled: loading,
      }}
    >
      <div className="flex flex-col gap-4">
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
