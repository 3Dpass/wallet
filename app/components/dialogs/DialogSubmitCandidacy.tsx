import { Intent } from "@blueprintjs/core";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import keyring from "@polkadot/ui-keyring";
import { useApi } from "../Api";
import BaseDialog from "./BaseDialog";
import { AddressSelect } from "../governance/AddressSelect";
import useToaster from "../../hooks/useToaster";
import { signAndSend } from "../../utils/sign";
import type { Vec } from "@polkadot/types";
import type { ITuple } from "@polkadot/types/types";

interface DialogSubmitCandidacyProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DialogSubmitCandidacy({ isOpen, onClose }: DialogSubmitCandidacyProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidIdentity, setHasValidIdentity] = useState(false);
  const [numCandidates, setNumCandidates] = useState(0);

  useEffect(() => {
    const allAccounts = keyring.getPairs().map((pair) => pair.address);
    setAccounts(allAccounts);
    if (!selectedAccount && allAccounts.length > 0) {
      setSelectedAccount(allAccounts[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    async function fetchNumCandidates() {
      if (!api) return;
      try {
        const candidates = (await api.query.phragmenElection.candidates()) as Vec<ITuple>;
        setNumCandidates(candidates.length);
      } catch (error) {
        console.error("Failed to fetch number of candidates:", error);
        setNumCandidates(0);
      }
    }

    if (isOpen) {
      fetchNumCandidates();
    }
  }, [api, isOpen]);

  useEffect(() => {
    async function checkIdentity() {
      if (!api || !selectedAccount) {
        setHasValidIdentity(false);
        return;
      }
      setIsLoading(true);
      try {
        const identity = await api.derive.accounts.info(selectedAccount);
        if (identity && identity.identity) {
          const { judgements } = identity.identity;
          const hasGoodJudgement = judgements.some(
            ([, judgement]) => judgement.isReasonable || judgement.isKnownGood
          );
          const hasBadJudgement = judgements.some(
            ([, judgement]) =>
              judgement.isErroneous ||
              judgement.isLowQuality ||
              judgement.isOutOfDate
          );

          const isValid = hasGoodJudgement && !hasBadJudgement;
          setHasValidIdentity(isValid);

          if (!isValid) {
            const message = hasBadJudgement
              ? t(
                  "governance.identity_prohibitive",
                  "Account has a prohibitive identity judgment (e.g., Erroneous, Low Quality)."
                )
              : t(
                  "governance.identity_required",
                  "Account must have a 'Reasonable' or 'KnownGood' identity judgment."
                );
            toaster.show({
              icon: "warning-sign",
              intent: Intent.WARNING,
              message,
            });
          }
        } else {
          setHasValidIdentity(false);
          toaster.show({
            icon: "warning-sign",
            intent: Intent.WARNING,
            message: t(
              "governance.identity_required",
              "Account must have a 'Reasonable' or 'KnownGood' identity judgment."
            ),
          });
        }
      } catch (error) {
        setHasValidIdentity(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkIdentity();
  }, [api, selectedAccount, t, toaster]);

  const canSubmit = !!api && !!selectedAccount && hasValidIdentity;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    if (!selectedAccount) return;

    setIsLoading(true);
    try {
      // Check if keyring is ready before getting pair
      if (keyring.getPairs().length === 0 && keyring.getAccounts().length === 0) {
        throw new Error("Keyring not ready");
      }
      const pair = keyring.getPair(selectedAccount);
      const isLocked = pair.isLocked && !pair.meta.isInjected;
      if (isLocked) {
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: t("messages.lbl_account_locked"),
        });
        setIsLoading(false);
        return;
      }
      const tx = api.tx.phragmenElection.submitCandidacy(numCandidates);
      await signAndSend(tx, pair, {}, (status) => {
        if (status.isInBlock) {
          toaster.show({
            icon: "endorsed",
            intent: Intent.SUCCESS,
            message: t("governance.candidacy_submitted", "Candidacy submitted!"),
          });
          setIsLoading(false);
          onClose();
        }
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: errorMessage,
      });
      setIsLoading(false);
    }
  }, [api, canSubmit, selectedAccount, t, toaster, onClose, numCandidates, hasValidIdentity]);

  const handleAccountChange = useCallback((address: string | null) => {
    setSelectedAccount(address);
  }, []);

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("governance.submit_candidacy", "Submit Candidacy")}
      primaryButton={{
        intent: Intent.PRIMARY,
        disabled: !canSubmit,
        onClick: handleSubmit,
        icon: "endorsed",
        loading: isLoading,
        text: t("governance.submit_candidacy_btn", "Submit Candidacy"),
      }}
    >
      <div className="mb-4">
        <AddressSelect
          onAddressChange={handleAccountChange}
          selectedAddress={selectedAccount}
          addresses={accounts}
        />
      </div>
    </BaseDialog>
  );
} 