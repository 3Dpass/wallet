import {
  Button,
  Checkbox,
  Classes,
  Dialog,
  Intent,
  NumericInput,
  Tag,
} from "@blueprintjs/core";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import { signAndSend } from "../../utils/sign";
import { useApi } from "../Api";
import AmountInput from "../common/AmountInput";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
  onAfterSubmit: () => void;
};

const autoExtendPeriod = 45000;

export default function DialogLockFunds({
  pair,
  isOpen,
  onClose,
  onAfterSubmit,
}: IProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dataInitial = useMemo(() => {
    return {
      amount: "",
      amount_number: 0,
      block: "",
      block_number: 0,
      current_block: null,
      auto_extend: false,
    };
  }, []);
  const [data, setData] = useState(dataInitial);

  const handleOnOpening = useCallback(() => {
    setIsLoading(false);
    setData(dataInitial);
  }, [dataInitial]);

  useEffect(() => {
    if (!isOpen || !api) {
      return;
    }

    async function load() {
      if (!api) {
        return;
      }
      const bestNumber = await api.derive.chain.bestNumber();
      const blockNumber = bestNumber.toJSON();
      setData((prev) => ({
        ...prev,
        current_block: blockNumber,
        block: blockNumber + autoExtendPeriod,
        block_number: blockNumber + autoExtendPeriod,
      }));
    }

    void load();
  }, [isOpen, api]);

  useEffect(() => {
    setCanSubmit(false);
    if (!isOpen || !api || data.current_block === null) {
      return;
    }
    setCanSubmit(
      data.amount_number > 0 &&
        data.block_number >= data.current_block + autoExtendPeriod
    );
  }, [isOpen, api, data]);

  const handleAmountChange = useCallback(
    (valueAsNumber: number, valueAsString: string) => {
      setData((prev) => ({
        ...prev,
        amount: valueAsString,
        amount_number: valueAsNumber,
      }));
    },
    []
  );

  const handleBlockChange = useCallback(
    (valueAsNumber: number, valueAsString: string) => {
      setData((prev) => ({
        ...prev,
        block: valueAsString,
        block_number: valueAsNumber,
      }));
    },
    []
  );

  const handleAutoExtendChange = useCallback(() => {
    setData((prev) => ({ ...prev, auto_extend: !prev.auto_extend }));
  }, []);

  const handleSubmitClick = useCallback(async () => {
    if (!api) {
      return;
    }
    setIsLoading(true);
    try {
      const value = BigInt(data.amount_number * 1_000_000_000_000);
      const tx = api.tx.validatorSet.lock(
        value,
        data.block_number,
        data.auto_extend ? autoExtendPeriod : null
      );
      await signAndSend(tx, pair, {}, ({ status }) => {
        if (!status.isInBlock) {
          return;
        }
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: t("messages.lbl_lock_requested"),
        });
        setIsLoading(false);
        onAfterSubmit();
      });
    } catch (e: unknown) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e instanceof Error ? e.message : "Unknown error",
      });
      setIsLoading(false);
    }
  }, [api, data, onAfterSubmit, pair, toaster, t]);

  return (
    <Dialog
      isOpen={isOpen}
      usePortal
      onClose={onClose}
      onOpening={handleOnOpening}
      className="w-[90%] sm:w-[640px]"
    >
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        <AmountInput
          disabled={isLoading}
          onValueChange={handleAmountChange}
          placeholder={t("commons.lbl_amount")}
        />
        <NumericInput
          disabled={isLoading}
          buttonPosition={"none"}
          large
          fill
          placeholder={t("dlg_lock_funds.lbl_release_lock_after")}
          leftIcon="cube"
          onValueChange={handleBlockChange}
          value={data.block}
          rightElement={
            <Tag minimal>{t("dlg_lock_funds.lbl_block_number")}</Tag>
          }
        />
        <Checkbox
          checked={data.auto_extend}
          large
          onChange={handleAutoExtendChange}
        >
          {t("dlg_lock_funds.lbl_chk_extended")} {autoExtendPeriod}{" "}
          {t("dlg_lock_funds.lbl_chk_extended_1")}
        </Checkbox>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            onClick={onClose}
            text={t("commons.lbl_btn_cancel")}
            disabled={isLoading}
          />
          <Button
            intent={Intent.PRIMARY}
            icon="lock"
            text={t("dlg_lock_funds.lbl_btn_lock_funds")}
            disabled={isLoading || !canSubmit}
            loading={isLoading}
            onClick={handleSubmitClick}
          />
        </div>
      </div>
    </Dialog>
  );
}
