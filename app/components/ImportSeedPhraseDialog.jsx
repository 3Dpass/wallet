import keyring from "@polkadot/ui-keyring";
import { Button, Classes, Dialog, Intent, TextArea, Toaster } from "@blueprintjs/core";
import { useRef, useState } from "react";

export default function ImportSeedPhraseDialog({ isOpen, onClose }) {
  const [seedPhraseValue, setSeedPhraseValue] = useState("");
  const toaster = useRef();

  function handleOnOpening() {
    setSeedPhraseValue("");
  }

  function handleSeedPhraseChange(e) {
    setSeedPhraseValue(e.target.value);
  }

  function handleSeedPhraseImportClick() {
    try {
      keyring.addUri(seedPhraseValue);
      onClose();
    } catch (e) {
      const toast = {
        icon: "ban-circle",
        intent: Intent.DANGER,
        message: e.message,
      };
      toaster.current.show(toast);
    }
  }

  return (
    <>
      <Toaster ref={toaster} />
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening}>
        <div className={Classes.DIALOG_BODY}>
          <TextArea className="w-full" rows={5} onChange={handleSeedPhraseChange} value={seedPhraseValue} />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={onClose}>Cancel</Button>
            <Button intent={Intent.PRIMARY} onClick={handleSeedPhraseImportClick} icon="add">
              Import seed phrase
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
