import { Button, Classes, Dialog, Intent } from "@blueprintjs/core";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useAtomValue } from "jotai";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatOptionsAtom } from "../../atoms";
import useToaster from "../../hooks/useToaster";
import { ss58ToH160 } from "../../utils/converter";
import { signAndSend } from "../../utils/sign";
import { useApi } from "../Api";
import AmountInput from "../common/AmountInput";

interface DialogEvmWithdrawProps {
  isOpen: boolean;
  onClose: () => void;
  pair: KeyringPair;
}

function WithdrawDescription({
  pair,
  h160Address,
}: {
  pair: KeyringPair;
  h160Address: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-4">
      <p className="text-sm text-gray-300 mb-2">
        {t("dlg_evm_withdraw.lbl_description")}
      </p>
      <p className="text-xs text-gray-400">
        {t("dlg_evm_withdraw.lbl_address")}:{" "}
        <code className="text-xs">{pair.address}</code>
      </p>
      <p className="text-xs text-gray-400">
        {t("dlg_evm_withdraw.lbl_h160")}:{" "}
        <code className="text-xs">{h160Address}</code>
      </p>
    </div>
  );
}

function DialogFooter({
  onClose,
  loading,
  amount,
  h160Address,
  onSubmit,
}: {
  onClose: () => void;
  loading: boolean;
  amount: string;
  h160Address: string;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className={Classes.DIALOG_FOOTER}>
      <div className={Classes.DIALOG_FOOTER_ACTIONS}>
        <Button onClick={onClose}>{t("commons.lbl_btn_cancel")}</Button>
        <Button
          intent={Intent.PRIMARY}
          loading={loading}
          disabled={!amount || loading || !h160Address}
          onClick={onSubmit}
        >
          {t("dlg_evm_withdraw.lbl_btn_withdraw")}
        </Button>
      </div>
    </div>
  );
}

export default function DialogEvmWithdraw({
  isOpen,
  onClose,
  pair,
}: DialogEvmWithdrawProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const formatOptions = useAtomValue(formatOptionsAtom);
  const decimals =
    formatOptions && typeof formatOptions.decimals === "number"
      ? formatOptions.decimals
      : 12;

  // Memoize the H160 address to avoid recalculating on every render
  const h160Address = useMemo(() => {
    const ss58Format = api?.registry.chainSS58;
    if (ss58Format === undefined) {
      return "";
    }
    return ss58ToH160(pair.address, ss58Format);
  }, [pair.address, api]);

  const handleAmountChange = useCallback(
    (_valueAsNumber: number, valueAsString: string) => {
      setAmount(valueAsString);
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!api) {
      toaster.show({ intent: "danger", message: t("API unavailable.") });
      return;
    }
    setLoading(true);
    try {
      // Convert P3D to min units without precision loss
      const [integer, fraction = ""] = amount.split(".");
      const paddedFraction = fraction.padEnd(decimals, "0");
      const truncatedFraction = paddedFraction.slice(0, decimals);
      const amountInMinUnits = BigInt((integer || "0") + truncatedFraction);

      const tx = api.tx.evm.withdraw(h160Address, amountInMinUnits.toString());
      await signAndSend(tx, pair);
      toaster.show({
        intent: "success",
        message: t("EVM withdrawal initiated!"),
      });
      setLoading(false);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toaster.show({
        intent: "danger",
        message: t("Failed to withdraw from EVM: ") + message,
      });
      setLoading(false);
    }
  }, [api, amount, decimals, h160Address, onClose, pair, t, toaster]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("dlg_evm_withdraw.lbl_title")}
      className="w-[90%] sm:w-[400px]"
    >
      <div className={Classes.DIALOG_BODY}>
        <WithdrawDescription pair={pair} h160Address={h160Address} />
        <AmountInput
          disabled={loading}
          onValueChange={handleAmountChange}
          placeholder={t("dlg_evm_withdraw.lbl_placeholder_amount")}
          unit="P3D"
        />
      </div>
      <DialogFooter
        onClose={onClose}
        loading={loading}
        amount={amount}
        h160Address={h160Address}
        onSubmit={handleSubmit}
      />
    </Dialog>
  );
}
