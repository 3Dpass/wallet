import { Icon, InputGroup, Intent } from "@blueprintjs/core";
import keyring from "@polkadot/ui-keyring";
import { lastSelectedAccountAtom } from "app/atoms";
import { useApi } from "app/components/Api";
import { AddressIcon } from "app/components/common/AddressIcon";
import useToaster from "app/hooks/useToaster";
import { isValidPolkadotAddress } from "app/utils/address";
import { signAndSend } from "app/utils/sign";
import { useAtom } from "jotai";
import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import BaseDialog from "./BaseDialog";

interface DialogAwardBountyProps {
  bountyId: string;
  isOpen: boolean;
  onClose: () => void;
  onAwarded?: () => void;
}

export default function DialogAwardBounty({
  bountyId,
  isOpen,
  onClose,
  onAwarded,
}: DialogAwardBountyProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [beneficiary, setBeneficiary] = useState("");
  const [loading, setLoading] = useState(false);
  const [isBeneficiaryValid, setIsBeneficiaryValid] = useState(false);
  const beneficiaryAddress = beneficiary.trim();

  useEffect(() => {
    if (!isOpen) {
      setBeneficiary("");
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsBeneficiaryValid(
      beneficiaryAddress === "" || isValidPolkadotAddress(beneficiaryAddress)
    );
  }, [beneficiaryAddress]);

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

  const handleBeneficiaryChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setBeneficiary(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (!api) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "API not ready",
      });
      return;
    }
    if (!selectedAccount || !beneficiaryAddress) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message:
          t("messages.lbl_fill_required_fields") ||
          "Please fill all required fields.",
      });
      return;
    }
    if (!isBeneficiaryValid) {
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
      const tx = api.tx.bounties.awardBounty(bountyId, beneficiaryAddress);
      void signAndSend(tx, pair, {}, ({ status }) => {
        if (!status.isInBlock) return;
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message:
            t("governance.bounty_awarded") || "Bounty awarded successfully!",
        });
        if (onAwarded) onAwarded();
        setLoading(false);
        onClose();
      }).catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: errorMessage,
        });
        setLoading(false);
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: errorMessage,
      });
      setLoading(false);
    }
  }, [
    api,
    beneficiaryAddress,
    bountyId,
    isBeneficiaryValid,
    onAwarded,
    onClose,
    pair,
    selectedAccount,
    t,
    toaster,
  ]);

  const addressIcon =
    beneficiaryAddress !== "" && isBeneficiaryValid ? (
      <AddressIcon address={beneficiaryAddress} className="m-2" />
    ) : (
      <Icon icon="asterisk" />
    );

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("governance.award_bounty") || "Award bounty"}
      primaryButton={{
        text: t("governance.award_bounty") || "Award bounty",
        icon: "endorsed",
        onClick: handleSubmit,
        intent: Intent.PRIMARY,
        loading,
        disabled:
          loading ||
          !selectedAccount ||
          !isBeneficiaryValid ||
          !beneficiaryAddress,
      }}
    >
      <InputGroup
        fill
        className="font-mono"
        disabled={loading}
        leftElement={addressIcon}
        onChange={handleBeneficiaryChange}
        placeholder={
          t("governance.enter_bounty_beneficiary") ||
          "Enter implementor address"
        }
        required
        spellCheck={false}
        value={beneficiary}
      />
    </BaseDialog>
  );
}
