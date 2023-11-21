import { Button, Classes, Dialog, Icon, InputGroup, Intent } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";
import { isValidPolkadotAddress } from "../../utils/address";
import { AddressIcon } from "../common/AddressIcon";
import type { SignerOptions } from "@polkadot/api/types";
import { signAndSend } from "../../utils/sign";
import useToaster from "../../hooks/useToaster";
import { useApi } from "../Api";
import { useTranslation } from "react-i18next";

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
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
    } finally {
      setIsLoading(false);
      onClose();
    }
  }

  const addressIcon = isValidPolkadotAddress(data) ? <AddressIcon address={data} className="m-2" /> : <Icon icon="asterisk" />;

  return (
    <Dialog isOpen={isOpen} usePortal onOpening={handleOnOpening} onClose={onClose} className="w-[90%] sm:w-[640px]">
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
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
            text={t("dlg_miner.lbl_btn_add_miner")}
          />
        </div>
      </div>
    </Dialog>
  );
}
