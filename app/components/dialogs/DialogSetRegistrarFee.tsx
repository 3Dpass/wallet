import { Dialog, Classes, Button, Intent } from "@blueprintjs/core";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../Api";
import useToaster from "../../hooks/useToaster";
import { signAndSend } from "../../utils/sign";
import type { KeyringPair } from "@polkadot/keyring/types";
import AmountInput from "../common/AmountInput";
import { useAtomValue } from "jotai";
import { formatOptionsAtom } from "../../atoms";

interface DialogSetRegistrarFeeProps {
  isOpen: boolean;
  onClose: () => void;
  registrarPair: KeyringPair;
}

export default function DialogSetRegistrarFee({ isOpen, onClose, registrarPair }: DialogSetRegistrarFeeProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [fee, setFee] = useState("");
  const [feeNumber, setFeeNumber] = useState(0);
  const [loading, setLoading] = useState(false);
  const [registrarIndex, setRegistrarIndex] = useState<number | null>(null);
  const formatOptions = useAtomValue(formatOptionsAtom);
  const decimals = formatOptions && typeof formatOptions.decimals === "number" ? formatOptions.decimals : 12;

  useEffect(() => {
    if (!isOpen || !api || !registrarPair) return;
    (async () => {
      const registrars = (await api.query.identity.registrars()).toHuman() as any[];
      let index = null;
      if (Array.isArray(registrars)) {
        for (let i = 0; i < registrars.length; i++) {
          if (registrars[i] && registrars[i].account === registrarPair.address) {
            index = i;
            break;
          }
        }
      }
      setRegistrarIndex(index);
    })();
  }, [isOpen, api, registrarPair]);

  const handleSubmit = async () => {
    if (!api || registrarIndex === null) {
      toaster.show({ intent: "danger", message: t("Registrar index not found or API unavailable.") });
      return;
    }
    setLoading(true);
    try {
      // Convert P3D to plancks using 10 ** decimals
      const feePlancks = BigInt(Number(fee) * 10 ** decimals);
      const tx = api.tx.identity.setFee(registrarIndex, feePlancks.toString());
      await signAndSend(tx, registrarPair);
      toaster.show({ intent: "success", message: t("Fee updated!") });
      setLoading(false);
      onClose();
    } catch (err: any) {
      toaster.show({ intent: "danger", message: t("Failed to set fee: ") + (err?.message || err) });
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t("Set Registrar Fee")} className="w-[90%] sm:w-[400px]">
      <div className={Classes.DIALOG_BODY}>
        <AmountInput
          disabled={loading}
          onValueChange={(valueAsNumber, valueAsString) => {
            setFee(valueAsString);
            setFeeNumber(valueAsNumber);
          }}
          placeholder={t("Enter new fee")}
          unit="P3D"
        />
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose}>{t("commons.lbl_btn_cancel")}</Button>
          <Button
            intent={Intent.PRIMARY}
            loading={loading}
            disabled={!fee || registrarIndex === null || loading}
            onClick={handleSubmit}
          >
            {t("Set Fee")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}