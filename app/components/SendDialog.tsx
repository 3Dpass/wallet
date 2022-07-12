import { Button, Classes, Dialog, InputGroup, Intent, NumericInput } from "@blueprintjs/core";
import { useState } from "react";
import Identicon from "@polkadot/react-identicon";

export default function SendDialog({ isOpen, onSubmit, onClose }) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState(null);

  function handleOnOpening() {
    setAddress("");
    setAmount(null);
  }

  function handleAddressChange(e) {
    setAddress(e.target.value);
  }

  function handleAmountChange(e) {
    setAmount(e.target.value);
  }

  const icon = <Identicon value={address} size={40} theme="substrate" />;

  return (
    <>
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} className="w-[560px]">
        <div className={Classes.DIALOG_BODY}>
          <InputGroup large={true} className="font-mono mb-2" spellCheck={false} placeholder="Enter address to send to" onChange={handleAddressChange} value={address} leftElement={icon} />
          <NumericInput large={true} placeholder="Amount" onChange={handleAmountChange} value={amount} />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={onClose} text="Cancel" />
            <Button intent={Intent.PRIMARY} onClick={() => onSubmit(address)} icon="send-message" text="Send [TODO]" />
          </div>
        </div>
      </Dialog>
    </>
  );
}
