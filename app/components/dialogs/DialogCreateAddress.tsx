import { Button, Card, Classes, Dialog, Icon, InputGroup, Intent } from "@blueprintjs/core";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { useState } from "react";
import TitledValue from "../common/TitledValue";
import useToaster from "../../hooks/useToaster";

interface IProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DialogCreateAddress({ isOpen, onClose }: IProps) {
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
      message: "Seed phrase copied to clipboard",
    });
  }

  return (
    <>
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOpening} onClose={onClose} className="w-[90%] sm:w-[640px]">
        <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
          <TitledValue title="Address" value={data.address} fontMono={true} />
          <div className="text-gray-500">Keep your seed phrase safe. Import the seed phrase in your wallet in order to recover the account.</div>
          <Card>
            <div className="text-center font-mono text-xl">{data.mnemonic}</div>
            <div className="text-center mt-4">
              <Button icon="duplicate" text="Copy" onClick={handleCopy} />
            </div>
          </Card>
          <InputGroup
            type="password"
            large={true}
            className="font-mono"
            spellCheck={false}
            placeholder="Passphrase"
            onChange={(e) => setData((prev) => ({ ...prev, passphrase: e.target.value }))}
            value={data.passphrase}
            leftElement={<Icon icon="lock" />}
          />
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
