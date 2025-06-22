import { Icon, InputGroup, Intent, Checkbox } from "@blueprintjs/core";
import type { SignerOptions } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import { isValidPolkadotAddress } from "../../utils/address";
import { signAndSend } from "../../utils/sign";
import { useApi } from "../Api";
import { AddressIcon } from "../common/AddressIcon";
import AmountInput from "../common/AmountInput";
import BaseDialog from "./BaseDialog";
import { h160ToSs58 } from "../../utils/converter";
import { isEthereumAddress } from "@polkadot/util-crypto";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
  onAfterSubmit: () => void;
  assetId?: string;
  assetMetadata?: {
    decimals: string;
    symbol: string;
  };
};

export default function DialogSendFunds({
  pair,
  isOpen,
  onClose,
  onAfterSubmit,
  assetId,
  assetMetadata,
}: IProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sendToEvm, setSendToEvm] = useState(false);
  const [targetAddress, setTargetAddress] = useState("");

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
    setData((prev) => ({
      ...prev,
      amount: valueAsString,
      amount_number: valueAsNumber,
    }));
  }

  function handleTipsChange(valueAsNumber: number, valueAsString: string) {
    setData((prev) => ({
      ...prev,
      tips: valueAsString,
      tips_number: valueAsNumber,
    }));
  }

  const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setData((prev) => ({ ...prev, address: e.target.value }));
  }, []);

  const handleEvmCheckboxChange = useCallback(() => {
    setSendToEvm((prev) => !prev);
  }, []);

  useEffect(() => {
    let finalAddress = data.address;
    let isValid = false;

    if (sendToEvm) {
      if (isEthereumAddress(data.address)) {
        const ss58Format = api?.registry.chainSS58;
        if (ss58Format !== undefined) {
          finalAddress = h160ToSs58(data.address, ss58Format);
          isValid = isValidPolkadotAddress(finalAddress);
        }
      }
    } else {
      isValid = isValidPolkadotAddress(data.address);
    }
    setTargetAddress(finalAddress);
    setCanSubmit(api !== undefined && isValid && data.amount_number > 0);
  }, [api, data, sendToEvm]);

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
      const decimals = assetMetadata ? Number(assetMetadata.decimals) : 12;
      const value = BigInt(data.amount_number * 10 ** decimals);
      const tips = BigInt(data.tips_number * 1_000_000_000_000);

      const tx = assetId
        ? api.tx.poscanAssets.transfer(assetId, targetAddress, value)
        : api.tx.balances.transfer(targetAddress, value);

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
    } catch (e) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e instanceof Error ? e.message : String(e),
      });
      setIsLoading(false);
    }
  }

  const addressIcon = isValidPolkadotAddress(targetAddress) ? (
    <AddressIcon address={targetAddress} className="m-2" />
  ) : (
    <Icon icon="asterisk" />
  );

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      onOpening={handleOnOpening}
      title={t("dlg_send.title", {
        unit: assetMetadata?.symbol || "P3D",
      })}
      primaryButton={{
        intent: Intent.PRIMARY,
        disabled: isLoading || !canSubmit,
        onClick: handleSubmitClick,
        icon: "send-message",
        loading: isLoading,
        text: t("dlg_send.lbl_btn_send"),
      }}
      footerContent={
        <Checkbox
          checked={sendToEvm}
          label={t("dlg_send.lbl_send_to_evm")}
          onChange={handleEvmCheckboxChange}
          disabled={isLoading}
        />
      }
    >
      <InputGroup
        disabled={isLoading}
        large
        className="font-mono"
        spellCheck={false}
        placeholder={t("dlg_send.lbl_address")}
        onChange={handleAddressChange}
        value={data.address}
        leftElement={addressIcon}
      />
      <AmountInput
        disabled={isLoading}
        onValueChange={handleAmountChange}
        placeholder={t("commons.lbl_amount")}
        unit={assetMetadata?.symbol || "P3D"}
      />
      <AmountInput
        disabled={isLoading}
        onValueChange={handleTipsChange}
        placeholder={t("dlg_send.lbl_tip")}
        unit="P3D"
      />
    </BaseDialog>
  );
}
