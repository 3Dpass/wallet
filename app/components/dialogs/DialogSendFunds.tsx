import { Button, Classes, Dialog, Icon, InputGroup, Intent } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";
import { isValidPolkadotAddress } from "../../utils/address";
import { AddressIcon } from "../common/AddressIcon";
import AmountInput from "../common/AmountInput";
import type { SignerOptions } from "@polkadot/api/types";
import { signAndSend } from "../../utils/sign";
import useToaster from "../../hooks/useToaster";
import { useApi } from "../Api";
import { useTranslation } from "react-i18next";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
  onAfterSubmit: () => void;
};

export default function DialogSendFunds({ pair, isOpen, onClose, onAfterSubmit }: IProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dataInitial = {
    address: "",
    amount: "",
    amount_number: 0,
    tips: "",
    tips_number: 0,
  };
  const [data, setData] = useState(dataInitial);

  function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
  }

  function handleAmountChange(valueAsNumber: number, valueAsString: string) {
    setData((prev) => ({ ...prev, amount: valueAsString, amount_number: valueAsNumber }));
  }

  function handleTipsChange(valueAsNumber: number, valueAsString: string) {
    setData((prev) => ({ ...prev, tips: valueAsString, tips_number: valueAsNumber }));
  }

  useEffect(() => {
    setCanSubmit(api !== undefined && isValidPolkadotAddress(data.address) && data.amount_number > 0);
  }, [api, data]);

  async function handleSubmitClick() {
    if (!api) {
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_account_locked"),
      });
      return;
    }
    setIsLoading(true);
    try {
      const value = BigInt(data.amount_number * 1_000_000_000_000);
      const tips = BigInt(data.tips_number * 1_000_000_000_000);
      const tx = api.tx.balances.transfer(data.address, value);
      const options: Partial<SignerOptions> = {};
      if (tips > 0) {
        options.tip = tips.toString();
      }
      await signAndSend(tx, pair, options, ({ status }) => {
        if (!status.isInBlock) {
          return;
        }
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: t("messages.lbl_tx_sent"),
        });
        setIsLoading(false);
        onAfterSubmit();
      });
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
      setIsLoading(false);
    }
  }

  const addressIcon = isValidPolkadotAddress(data.address) ? <AddressIcon address={data.address} className="m-2" /> : <Icon icon="asterisk" />;

  return (
    <Dialog isOpen={isOpen} usePortal onOpening={handleOnOpening} onClose={onClose} className="w-[90%] sm:w-[640px]">
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        <InputGroup
          disabled={isLoading}
          large
          className="font-mono"
          spellCheck={false}
          placeholder={t("dlg_send.lbl_address")}
          onChange={(e) => setData((prev) => ({ ...prev, address: e.target.value }))}
          value={data.address}
          leftElement={addressIcon}
        />
        <AmountInput disabled={isLoading} onValueChange={handleAmountChange} placeholder={t("commons.lbl_amount")} />
        <AmountInput disabled={isLoading} onValueChange={handleTipsChange} placeholder={t("dlg_send.lbl_tip")} />
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose} text={t("commons.lbl_btn_cancel")} disabled={isLoading} />
          <Button
            intent={Intent.PRIMARY}
            disabled={isLoading || !canSubmit}
            onClick={handleSubmitClick}
            icon="send-message"
            loading={isLoading}
            text={t("dlg_send.lbl_btn_send")}
          />
        </div>
      </div>
    </Dialog>
  );
}
