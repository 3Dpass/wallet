import { Button, Card, Classes, Dialog, Intent } from "@blueprintjs/core";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { useState } from "react";
import TitledValue from "../common/TitledValue";

export default function DialogCreateAddress({ isOpen, onClose }) {
  const [mnemonic, setMnemonic] = useState("");
  const [address, setAddress] = useState("");

  function handleOpening() {
    const mnemonic = mnemonicGenerate();
    setMnemonic(mnemonic);
    const result = keyring.addUri(mnemonic);
    setAddress(result.pair.address);
  }

  return (
    <>
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOpening}>
        <div className={Classes.DIALOG_BODY}>
          <TitledValue title="Address" value={address} />
          <div className="text-gray-500 my-3">
            The secret seed value for this account. Ensure that you keep this in a safe place, with access to the seed you can re-create the account.
          </div>
          <Card>
            <code>{mnemonic}</code>
          </Card>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button intent={Intent.PRIMARY} onClick={onClose} icon="tick" text="OK" />
          </div>
        </div>
      </Dialog>
    </>
  );
}
