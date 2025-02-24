import {
  Button,
  Card,
  Classes,
  Dialog,
  Icon,
  InputGroup,
  Intent,
} from "@blueprintjs/core";
import keyring from "@polkadot/ui-keyring";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import TitledValue from "../common/TitledValue";

interface IProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DialogCreateAddress({ isOpen, onClose }: IProps) {
  const { t } = useTranslation();
  const toaster = useToaster();
  const dataInitial = {
    address: "",
    mnemonic: "",
    passphrase: "",
  };
  const [data, setData] = useState(dataInitial);

  function handleOpening() {
    setData(dataInitial);
    onGenerateClick();
  }

  function onGenerateClick() {
    const mnemonic = mnemonicGenerate();
    const pair = keyring.createFromUri(mnemonic);
    setData((prev) => ({ ...prev, mnemonic, address: pair.address }));
  }

  function handleCreateClick() {
    keyring.addUri(data.mnemonic, data.passphrase);
    onClose();
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(data.mnemonic);
    toaster.show({
      icon: "tick",
      intent: Intent.SUCCESS,
      message: t("messages.lbl_wallet_seed_phrase_copied"),
    });
  }

  return (
    <>
      <Dialog
        isOpen={isOpen}
        usePortal
        onOpening={handleOpening}
        onClose={onClose}
        className="w-[90%] sm:w-[640px]"
      >
        <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
          <TitledValue
            title={t("dlg_wallet.lbl_title")}
            value={data.address}
            fontMono
          />
          <div className="text-gray-500">{t("dlg_wallet.lbl_keep_seed")}</div>
          <Card>
            <div className="text-center font-mono text-xl">{data.mnemonic}</div>
            <div className="text-center mt-4">
              <Button
                icon="duplicate"
                text={t("dlg_wallet.lbl_btn_copy")}
                onClick={handleCopy}
              />
            </div>
          </Card>
          <InputGroup
            type="password"
            large
            className="font-mono"
            spellCheck={false}
            placeholder={t("dlg_wallet.lbl_password")}
            onChange={(e) =>
              setData((prev) => ({ ...prev, passphrase: e.target.value }))
            }
            value={data.passphrase}
            leftElement={<Icon icon="lock" />}
          />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              intent={Intent.NONE}
              onClick={onClose}
              icon="cross"
              text={t("commons.lbl_btn_cancel")}
            />
            <Button
              intent={Intent.NONE}
              onClick={onGenerateClick}
              icon="refresh"
              text={t("dlg_wallet.lbl_more")}
            />
            <Button
              intent={Intent.PRIMARY}
              onClick={handleCreateClick}
              icon="plus"
              text={t("dlg_wallet.lbl_create")}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
