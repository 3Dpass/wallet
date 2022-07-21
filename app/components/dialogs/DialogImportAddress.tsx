import { Button, Classes, Dialog, Intent, TextArea } from "@blueprintjs/core";
import { useEffect, useState } from "react";

export default function DialogImportAddress({ isOpen, onImport, onClose }) {
  const [value, setValue] = useState("");
  const [canPaste, setCanPaste] = useState(false);

  useEffect(() => {
    setCanPaste(navigator.clipboard.readText !== undefined);
  }, []);

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
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} onClose={onClose} className="w-[90%] sm:w-[640px]">
        <div className={Classes.DIALOG_BODY}>
          <TextArea className="w-full font-mono" rows={5} onChange={handleSeedPhraseChange} value={value} />
          {canPaste && (
            <div className="text-center mt-4">
              <Button icon="clipboard" text="Paste" onClick={handlePaste} />
            </div>
          )}
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
