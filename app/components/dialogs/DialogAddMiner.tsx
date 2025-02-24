import { Icon, InputGroup, Intent } from "@blueprintjs/core";
import type { SignerOptions } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import { isValidPolkadotAddress } from "../../utils/address";
import { signAndSend } from "../../utils/sign";
import { useApi } from "../Api";
import { AddressIcon } from "../common/AddressIcon";
import BaseDialog from "./BaseDialog";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogAddMiner({ pair, isOpen, onClose }: IProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState("");

  function handleOnOpening() {
    setIsLoading(false);
    setData("");
  }

  useEffect(() => {
    setCanSubmit(api !== undefined && isValidPolkadotAddress(data));
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
        message: t("commons.lbl_account_locked"),
      });
      return;
    }
    setIsLoading(true);
    try {
      const tx = api.tx.miningPool.addMember(data);
      const options: Partial<SignerOptions> = {};
      await signAndSend(tx, pair, options);
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: t("dlg_miner.lbl_member_added_to_pool"),
      });
    } catch (e: unknown) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e instanceof Error ? e.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
      onClose();
    }
  }

  const addressIcon = isValidPolkadotAddress(data) ? (
    <AddressIcon address={data} className="m-2" />
  ) : (
    <Icon icon="asterisk" />
  );

  return (
    <BaseDialog
      isOpen={isOpen}
      onOpening={handleOnOpening}
      onClose={onClose}
      primaryButton={{
        intent: Intent.PRIMARY,
        disabled: !canSubmit,
        onClick: handleSubmitClick,
        icon: "send-message",
        loading: isLoading,
        text: t("dlg_miner.lbl_btn_add_miner"),
      }}
    >
      <InputGroup
        disabled={isLoading}
        large
        className="font-mono"
        spellCheck={false}
        placeholder={t("dlg_miner.lbl_miner_address")}
        onChange={(e) => setData(e.target.value)}
        value={data}
        leftElement={addressIcon}
      />
    </BaseDialog>
  );
}
