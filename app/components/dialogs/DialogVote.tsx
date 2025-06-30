import { Dialog, Button, Intent } from "@blueprintjs/core";
import { useState, useCallback } from "react";
import { useApi } from "../Api";
import { signAndSend } from "../../utils/sign";
import useToaster from "../../hooks/useToaster";
import { AccountName } from "../common/AccountName";
import AmountInput from "../common/AmountInput";
import keyring from "@polkadot/ui-keyring";
import { useTranslation } from "react-i18next";
import { useAtomValue } from "jotai";
import { formatOptionsAtom } from "../../atoms";
import { toChainUnit } from "../../utils/converter";

interface DialogVoteProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVotes: string[];
  selectedAccount: string;
}

export default function DialogVote({ isOpen, onClose, selectedVotes, selectedAccount }: DialogVoteProps) {
  const api = useApi();
  const toaster = useToaster();
  const [amount, setAmount] = useState("");
  const [amountNumber, setAmountNumber] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const formatOptions = useAtomValue(formatOptionsAtom);
  const decimals = formatOptions && typeof formatOptions.decimals === "number" ? formatOptions.decimals : 12;
  const unit = formatOptions && formatOptions.unit ? formatOptions.unit : "";

  const handleAmountChange = useCallback((valueAsNumber: number, valueAsString: string) => {
    setAmount(valueAsString);
    setAmountNumber(valueAsNumber);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!api || !selectedAccount || !amount || selectedVotes.length === 0) return;
    setIsLoading(true);
    try {
      const pair = keyring.getPair(selectedAccount);
      const isLocked = pair.isLocked && !pair.meta.isInjected;
      if (isLocked) {
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: "Account is locked.",
        });
        setIsLoading(false);
        return;
      }
      // Convert amount to plancks (chain units)
      const value = toChainUnit(amount, decimals);
      const tx = api.tx.phragmenElection.vote(selectedVotes, value);
      await signAndSend(tx, pair, {}, ({ status }) => {
        if (!status.isInBlock) return;
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: "Vote submitted!",
        });
        setIsLoading(false);
        onClose();
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
  }, [api, selectedAccount, amount, selectedVotes, toaster, onClose, decimals]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('governance.submit_vote')}>
      <div className="p-4 flex flex-col gap-4">
        <div>
          <div className="mb-2 font-semibold">{t('governance.selected_members', 'Selected members:')}</div>
          <ul className="mb-2">
            {selectedVotes.map((address) => (
              <li key={address}>
                <AccountName address={address} />
              </li>
            ))}
          </ul>
        </div>
        <AmountInput
          disabled={isLoading}
          onValueChange={handleAmountChange}
          placeholder={t('governance.enter_amount_to_stake', 'Enter amount to stake for voting')}
          unit={unit}
        />
        <div className="flex justify-end mt-4 gap-2">
          <Button
            text={t('commons.cancel', 'Cancel')}
            onClick={onClose}
            disabled={isLoading}
          />
          <Button
            intent="primary"
            text={t('governance.submit_vote_btn', 'Vote')}
            onClick={handleSubmit}
            loading={isLoading}
            disabled={isLoading || !selectedAccount || !amount || amountNumber <= 0 || selectedVotes.length === 0}
          />
        </div>
      </div>
    </Dialog>
  );
} 