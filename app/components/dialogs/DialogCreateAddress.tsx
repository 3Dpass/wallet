import { Button, Card, Classes, Dialog, Intent } from "@blueprintjs/core";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { useState } from "react";
import TitledValue from "../common/TitledValue";
import { useAtomValue } from "jotai";
import { toasterAtom } from "../../atoms";

export default function DialogCreateAddress({ isOpen, onClose }) {
  const toaster = useAtomValue(toasterAtom);
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
    toaster &&
      toaster.show({
        icon: "tick",
        intent: Intent.SUCCESS,
        message: "Seed phrase copied to clipboard",
      });
  }

  return (
    <>
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOpening} onClose={onClose} className="w-[90%] sm:w-[640px]">
        <div className={Classes.DIALOG_BODY}>
          <TitledValue title="Address" value={address} fontMono={true} />
          <div className="text-gray-500 my-3">Keep your seed phrase safe. Import the seed phrase in your wallet in order to recover the account.</div>
          <Card>
            <div className="text-center font-mono text-xl">{mnemonic}</div>
            <div className="text-center mt-4">
              <Button icon="duplicate" text="Copy" onClick={handleCopy} />
            </div>
          </Card>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button intent={Intent.NONE} onClick={onClose} icon="cross" text="Cancel" />
            <Button intent={Intent.NONE} onClick={onGenerateClick} icon="refresh" text="More" />
            <Button intent={Intent.PRIMARY} onClick={handleCreateClick} icon="plus" text="Create" />
          </div>
        </div>
      </Dialog>
    </>
  );
}
