import { InputGroup, Intent } from "@blueprintjs/core";
import keyring from "@polkadot/ui-keyring";
import { lastSelectedAccountAtom } from "app/atoms";
import { useApi } from "app/components/Api";
import { signAndSend } from "app/utils/sign";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useState, useEffect, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import BaseDialog from "./BaseDialog";
import AmountInput from "../common/AmountInput";
import { formatOptionsAtom } from "../../atoms";

interface DialogProposeBountyProps {
  isOpen: boolean;
  onClose: () => void;
  onProposed?: () => void;
}

export default function DialogProposeBounty({
  isOpen,
  onClose,
  onProposed,
}: DialogProposeBountyProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const formatOptions = useAtomValue(formatOptionsAtom);
  const decimals = formatOptions && typeof formatOptions.decimals === "number" ? formatOptions.decimals : 12;
  const unit = formatOptions && formatOptions.unit ? formatOptions.unit : "";
  const [value, setValue] = useState("");
  const [valueNumber, setValueNumber] = useState(0);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear form when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      setValue("");
      setValueNumber(0);
      setDescription("");
      setLoading(false);
    }
  }, [isOpen]);

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

  const handleAmountChange = useCallback((num: number, str: string) => {
    setValue(str);
    setValueNumber(num);
  }, []);

  const handleDescriptionChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!api) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "API not ready",
      });
      return;
    }
    if (!selectedAccount || !value || valueNumber <= 0 || !description) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_fill_required_fields") || "Please fill all required fields.",
      });
      return;
    }
    if (!pair) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_no_account_selected") || "No account selected or unable to get keyring pair.",
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
      // Convert value to plancks (chain units), as in send funds dialog
      const valuePlancks = BigInt(Math.floor(valueNumber * 10 ** decimals));
      const tx = api.tx.bounties.proposeBounty(valuePlancks, description);
      signAndSend(tx, pair, {}, ({ status }) => {
        if (!status.isInBlock) return;
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: t("governance.propose_bounty") || "Bounty proposed successfully!",
        });
        if (onProposed) onProposed();
        onClose();
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [api, selectedAccount, value, valueNumber, description, pair, toaster, t, onProposed, onClose, decimals]);

  // Bond calculation constants
  const BASE_BOND = 1;
  const ONE_SYMBOL_COST = 0.01;
  const bond = (BASE_BOND + description.length * ONE_SYMBOL_COST).toFixed(4);

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("governance.propose_bounty") || "Propose bounty"}
      primaryButton={{
        text: t("governance.propose_bounty") || "Propose bounty",
        icon: "plus",
        onClick: handleSubmit,
        intent: "primary",
        loading,
        disabled: loading || !selectedAccount,
      }}
      footerContent={
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {t("governance.bond") || "Bond"}: <span className="font-mono">{bond}{unit && ` ${unit}`}</span>
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <AmountInput
          disabled={loading}
          onValueChange={handleAmountChange}
          placeholder={t("governance.enter_amount_to_allocate") || "Enter amount to allocate"}
          unit={unit}
        />
        <InputGroup
          fill
          placeholder={t("governance.enter_bounty_description") || "Enter bounty description"}
          value={description}
          onChange={handleDescriptionChange}
          required
        />
      </div>
    </BaseDialog>
  );
} 