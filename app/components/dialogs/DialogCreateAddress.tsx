import {
  Card,
  Icon,
  InputGroup,
  Intent,
  Button,
} from "@blueprintjs/core";
import keyring from "@polkadot/ui-keyring";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import TitledValue from "../common/TitledValue";
import BaseDialog from "./BaseDialog";

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
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      onOpening={handleOpening}
      primaryButton={{
        intent: Intent.PRIMARY,
        onClick: handleCreateClick,
        icon: "plus",
        text: t("dlg_wallet.lbl_create"),
      }}
      secondaryButton={{
        intent: Intent.NONE,
        onClick: onGenerateClick,
        icon: "refresh",
        text: t("dlg_wallet.lbl_more"),
      }}
    >
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
    </BaseDialog>
  );
}
