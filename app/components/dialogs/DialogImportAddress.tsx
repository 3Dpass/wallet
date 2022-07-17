import { Button, Classes, Dialog, Intent, TextArea } from "@blueprintjs/core";
import { useState } from "react";

export default function DialogImportAddress({ isOpen, onImport, onClose }) {
  const [value, setValue] = useState("");

  function handleOnOpening() {
    setValue("");
  }

  function handleSeedPhraseChange(e) {
    setValue(e.target.value);
  }

  async function handlePaste() {
    const clipboardValue = await navigator.clipboard.readText();
    setValue(clipboardValue);
  }

  return (
    <>
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening}>
        <div className={Classes.DIALOG_BODY}>
          <TextArea className="w-full font-mono" rows={5} onChange={handleSeedPhraseChange} value={value} />
          <div className="text-center mt-4">
            <Button icon="clipboard" text="Paste" onClick={handlePaste} />
          </div>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={onClose} text="Cancel" />
            <Button intent={Intent.PRIMARY} onClick={() => onImport(value)} icon="add" text="Import" />
          </div>
        </div>
      </Dialog>
    </>
  );
}
