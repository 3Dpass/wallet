import { Button, Classes, Dialog, Icon, InputGroup, Intent } from "@blueprintjs/core";
import { useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useAtomValue } from "jotai";
import { toasterAtom } from "../../atoms";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogUnlockAccount({ pair, isOpen, onClose }: IProps) {
  const toaster = useAtomValue(toasterAtom);
  const [passphrase, setPassphrase] = useState("");

  function handleOnOpening() {
    setPassphrase("");
  }

  async function handleSendClick() {
    try {
      await pair.unlock(passphrase);
      toaster &&
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: "Account is unlocked",
        });
      onClose();
    } catch (e) {
      toaster &&
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: e.message,
        });
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} onOpening={handleOnOpening} title="Unlock account">
      <div className={Classes.DIALOG_BODY}>
        <InputGroup
          type="password"
          large={true}
          className="font-mono mb-2"
          spellCheck={false}
          placeholder="Passphrase"
          onChange={(e) => setPassphrase(e.target.value)}
          value={passphrase}
          leftElement={<Icon icon="lock" />}
        />
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose} text="Cancel" />
          <Button intent={Intent.PRIMARY} onClick={handleSendClick} text="OK" />
        </div>
      </div>
    </Dialog>
  );
}
