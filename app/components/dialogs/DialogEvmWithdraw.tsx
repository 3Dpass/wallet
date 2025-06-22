import { Dialog, Classes, Button, Intent } from "@blueprintjs/core";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../Api";
import useToaster from "../../hooks/useToaster";
import { signAndSend } from "../../utils/sign";
import type { KeyringPair } from "@polkadot/keyring/types";
import AmountInput from "../common/AmountInput";
import { useAtomValue } from "jotai";
import { formatOptionsAtom } from "../../atoms";
import { decodeAddress } from "@polkadot/keyring";

interface DialogEvmWithdrawProps {
  isOpen: boolean;
  onClose: () => void;
  pair: KeyringPair;
}

export default function DialogEvmWithdraw({ isOpen, onClose, pair }: DialogEvmWithdrawProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [amount, setAmount] = useState("");
  const [amountNumber, setAmountNumber] = useState(0);
  const [loading, setLoading] = useState(false);
  const formatOptions = useAtomValue(formatOptionsAtom);
  const decimals = formatOptions && typeof formatOptions.decimals === "number" ? formatOptions.decimals : 12;

  const convertToH160 = (ss58Address: string): string => {
    try {
      // Decode the SS58 address to get the public key
      const publicKey = decodeAddress(ss58Address);
      // Convert to hex string using Array.from and map
      const hexString = Array.from(publicKey).map(b => b.toString(16).padStart(2, '0')).join('');
      // Take the first 20 bytes (40 hex characters) for H160
      return '0x' + hexString.slice(0, 40);
    } catch (error) {
      return '0x0000000000000000000000000000000000000000'; // fallback
    }
  };

  // Memoize the H160 address to avoid recalculating on every render
  const h160Address = useMemo(() => convertToH160(pair.address), [pair.address]);

  const handleSubmit = async () => {
    if (!api) {
      toaster.show({ intent: "danger", message: t("API unavailable.") });
      return;
    }
    setLoading(true);
    try {
      // Convert P3D to min units using 10 ** decimals
      const amountInMinUnits = BigInt(Number(amount) * 10 ** decimals);
      
      const tx = api.tx.evm.withdraw(h160Address, amountInMinUnits.toString());
      await signAndSend(tx, pair);
      toaster.show({ intent: "success", message: t("EVM withdrawal initiated!") });
      setLoading(false);
      onClose();
    } catch (err: any) {
      toaster.show({ intent: "danger", message: t("Failed to withdraw from EVM: ") + (err?.message || err) });
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t("dlg_evm_withdraw.lbl_title")} className="w-[90%] sm:w-[400px]">
      <div className={Classes.DIALOG_BODY}>
        <div className="mb-4">
          <p className="text-sm text-gray-300 mb-2">
            {t("dlg_evm_withdraw.lbl_description")}
          </p>
          <p className="text-xs text-gray-400">
            {t("dlg_evm_withdraw.lbl_address")}: <code className="text-xs">{pair.address}</code>
          </p>
          <p className="text-xs text-gray-400">
            {t("dlg_evm_withdraw.lbl_h160")}: <code className="text-xs">{h160Address}</code>
          </p>
        </div>
        <AmountInput
          disabled={loading}
          onValueChange={(valueAsNumber, valueAsString) => {
            setAmount(valueAsString);
            setAmountNumber(valueAsNumber);
          }}
          placeholder={t("dlg_evm_withdraw.lbl_placeholder_amount")}
          unit="P3D"
        />
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose}>{t("commons.lbl_btn_cancel")}</Button>
          <Button
            intent={Intent.PRIMARY}
            loading={loading}
            disabled={!amount || loading}
            onClick={handleSubmit}
          >
            {t("dlg_evm_withdraw.lbl_btn_withdraw")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
} 