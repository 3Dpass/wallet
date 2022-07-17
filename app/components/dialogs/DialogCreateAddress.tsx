import { Button, Card, Classes, Dialog, Intent } from "@blueprintjs/core";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { useState } from "react";
import TitledValue from "../common/TitledValue";

export default function DialogCreateAddress({ isOpen, onClose }) {
  const [mnemonic, setMnemonic] = useState("");
  const [address, setAddress] = useState("");

  function handleOpening() {
    onGenerateClick();
  }

  function onGenerateClick() {
    const mnemonic = mnemonicGenerate();
    setMnemonic(mnemonic);
    const pair = keyring.createFromUri(mnemonic);
    setAddress(pair.address);
  }

  function handleCreateClick() {
    keyring.addUri(mnemonic);
    onClose();
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(mnemonic);
  }

  return (
    <>
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOpening}>
        <div className={Classes.DIALOG_BODY}>
          <TitledValue title="Address" value={address} fontMono={true} />
          <div className="text-gray-500 my-3">Keep your seed phrase safe. Import the seed phrase in your wallet in order to recover the account.</div>
          <Card>
            <div className="text-center font-mono">{mnemonic}</div>
            <div className="text-center mt-4">
              <Button icon="duplicate" text="Copy" onClick={handleCopy} />
            </div>
          </Card>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button intent={Intent.NONE} onClick={onClose} icon="cross" text="Cancel" />
            <Button intent={Intent.NONE} onClick={onGenerateClick} icon="refresh" text="Generate another one" />
            <Button intent={Intent.PRIMARY} onClick={handleCreateClick} icon="plus" text="Create" />
          </div>
        </div>
      </Dialog>
    </>
  );
}
