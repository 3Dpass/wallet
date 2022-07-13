import { Button, Classes, Dialog, Intent, TextArea } from "@blueprintjs/core";
import { useState } from "react";

export default function DialogImportAccount({ isOpen, onImport, onClose }) {
  const [value, setValue] = useState("");

  function handleOnOpening() {
    setValue("");
  }

  function handleSeedPhraseChange(e) {
    setValue(e.target.value);
  }

  return (
    <>
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening}>
        <div className={Classes.DIALOG_BODY}>
          <TextArea className="w-full" rows={5} onChange={handleSeedPhraseChange} value={value} />
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
