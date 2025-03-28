import { Button, Icon, InputGroup, Intent, TextArea } from "@blueprintjs/core";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import BaseDialog from "./BaseDialog";

interface Props {
  isOpen: boolean;
  showPassword: boolean;
  onImport: (seed_phrase: string, passphrase: string) => void;
  onClose: () => void;
}

export default function DialogImportAddress({
  isOpen,
  showPassword,
  onImport,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const dataInitial = {
    seed_phrase: "",
    passphrase: "",
  };
  const [data, setData] = useState(dataInitial);
  const canPaste = navigator.clipboard.readText !== undefined;

  function handleOnOpening() {
    setData(dataInitial);
  }

  function handleSeedPhraseChange(
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) {
    setData((prev) => ({ ...prev, seed_phrase: event.target.value }));
  }

  async function handlePaste() {
    const clipboardValue = await navigator.clipboard.readText();
    setData((prev) => ({ ...prev, seed_phrase: clipboardValue }));
  }

  return (
    <BaseDialog
      isOpen={isOpen}
      onOpening={handleOnOpening}
      onClose={onClose}
      primaryButton={{
        intent: Intent.PRIMARY,
        onClick: () => onImport(data.seed_phrase, data.passphrase),
        icon: "add",
        text: t("dlg_import_address.lbl_btn_import"),
      }}
    >
      <TextArea
        className="w-full font-mono"
        rows={5}
        onChange={handleSeedPhraseChange}
        value={data.seed_phrase}
      />
      {canPaste && (
        <div className="text-center">
          <Button
            icon="clipboard"
            text={t("dlg_import_address.lbl_btn_paste")}
            onClick={handlePaste}
          />
        </div>
      )}
      {showPassword && (
        <InputGroup
          type="password"
          large
          className="font-mono"
          spellCheck={false}
          placeholder={t("dlg_import_address.lbl_passphrase")}
          onChange={(e) =>
            setData((prev) => ({ ...prev, passphrase: e.target.value }))
          }
          value={data.passphrase}
          leftElement={<Icon icon="lock" />}
        />
      )}
    </BaseDialog>
  );
}
