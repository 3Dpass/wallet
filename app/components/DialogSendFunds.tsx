import { Button, Classes, Dialog, Icon, InputGroup, Intent, NumericInput, Tag } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import Identicon from "@polkadot/react-identicon";
import { useAtomValue } from "jotai";
import type { KeyringPair } from "@polkadot/keyring/types";
import { polkadotApiAtom, toasterAtom } from "../atoms";
import { isValidAddressPolkadotAddress } from "../utils/address";

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
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState(0);

  function resetForm() {
    setIsLoading(false);
    setAddress("");
    setAmount(0);
  }

  function handleOnOpening() {
    resetForm();
  }

  function handleAddressChange(e) {
    setAddress(e.target.value);
  }

  useEffect(() => {
    setCanSend(api && isValidAddressPolkadotAddress(address) && amount > 0);
  }, [api, address, amount]);

  async function handleSendClick() {
    if (!api) {
      return;
    }
    setIsLoading(true);
    if (pair.isLocked) {
      // TODO: show unlock dialog
      pair.unlock();
    }
    try {
      const toSend = amount * 1_000_000_000_000;
      await api.tx.balances.transfer(address, toSend).signAndSend(pair);
      toaster &&
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: "Funds are sent",
        });
      onAfterSubmit();
    } catch (e) {
      toaster &&
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: e.message,
        });
    } finally {
      setIsLoading(false);
    }
  }

  const addressIcon = isValidAddressPolkadotAddress(address) ? <Identicon value={address} size={40} theme="substrate" /> : <Icon icon="asterisk" />;

  return (
    <>
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} className="w-[560px]">
        <div className={Classes.DIALOG_BODY}>
          <InputGroup disabled={isLoading} large={true} className="font-mono mb-2" spellCheck={false} placeholder="Enter address to send to" onChange={handleAddressChange} value={address} leftElement={addressIcon} />
          <NumericInput
            disabled={isLoading}
            selectAllOnFocus={true}
            buttonPosition={null}
            large={true}
            leftIcon="send-to"
            placeholder="Amount"
            onValueChange={setAmount}
            value={amount}
            fill={true}
            min={0}
            rightElement={<Tag minimal={true}>3DPt</Tag>}
          />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={onClose} text="Cancel" disabled={isLoading} />
            <Button intent={Intent.PRIMARY} disabled={isLoading || !canSend} onClick={handleSendClick} icon="send-message" loading={isLoading} text="Send" />
          </div>
        </div>
      </Dialog>
    </>
  );
}
