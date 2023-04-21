import { Button, Classes, Dialog, Icon, InputGroup, Intent } from "@blueprintjs/core";
import { useCallback, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";
import useToaster from "../../hooks/useToaster";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogUnlockAccount({ pair, isOpen, onClose }: IProps) {
  const toaster = useToaster();
  const [passphrase, setPassphrase] = useState("");

  function handleOnOpening() {
    setPassphrase("");
  }

  const handleSendClick = useCallback(async () => {
    try {
      await pair.unlock(passphrase);
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: "Account is unlocked",
      });
      onClose();
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
    }
  }, [pair, passphrase, onClose, toaster]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} onOpening={handleOnOpening} title="Unlock account">
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        <InputGroup
          type="password"
          large={true}
          className="font-mono"
          spellCheck={false}
          placeholder="Passphrase"
          onChange={(e) => setPassphrase(e.target.value)}
          value={passphrase}
          leftElement={<Icon icon="lock" />}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              void handleSendClick();
            }
          }}
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
