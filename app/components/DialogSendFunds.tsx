import { Button, Classes, Dialog, InputGroup, Intent, NumericInput } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import Identicon from "@polkadot/react-identicon";
import { useAtomValue } from "jotai";
import type { KeyringPair } from "@polkadot/keyring/types";
import { polkadotApiAtom, toasterAtom } from "../atoms";

type DialogSendFundsProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
  onAfterSubmit: () => void;
};

export default function DialogSendFunds({ pair, isOpen, onAfterSubmit, onClose }: DialogSendFundsProps) {
  const api = useAtomValue(polkadotApiAtom);
  const toaster = useAtomValue(toasterAtom);
  const [canSend, setCanSend] = useState(false);
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState(null);

  function handleOnOpening() {
    setAddress("");
    setAmount(null);
  }

  function handleAddressChange(e) {
    setAddress(e.target.value);
  }

  useEffect(() => {
    setCanSend(api && address.length === 49 && amount !== null);
  }, [api, address, amount]);

  async function handleSendClick() {
    if (!api) {
      return;
    }
    if (pair.isLocked) {
      // TODO: show unlock dialog
      pair.unlock();
    }
    try {
      const sent = await api.tx.balances.transfer(address, amount).signAndSend(pair);
      console.log(sent);
      onAfterSubmit();
    } catch (e) {
      toaster &&
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: e.message,
        });
    }
  }

  const icon = <Identicon value={address} size={40} theme="substrate" />;

  return (
    <>
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} className="w-[560px]">
        <div className={Classes.DIALOG_BODY}>
          <InputGroup large={true} className="font-mono mb-2" spellCheck={false} placeholder="Enter address to send to" onChange={handleAddressChange} value={address} leftElement={icon} />
          <NumericInput large={true} leftIcon="dollar" placeholder="Amount" onValueChange={setAmount} value={amount} fill={true} min={0} />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={onClose} text="Cancel" />
            <Button intent={Intent.PRIMARY} disabled={!canSend} onClick={handleSendClick} icon="send-message" text="Send [TODO]" />
          </div>
        </div>
      </Dialog>
    </>
  );
}
