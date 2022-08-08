import { Button, Classes, Dialog, Icon, InputGroup, Intent, NumericInput, Tag } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import type { KeyringPair } from "@polkadot/keyring/types";
import { apiAtom, toasterAtom } from "../../atoms";
import { isValidAddressPolkadotAddress } from "../../utils/address";
import { AddressIcon } from "../common/AddressIcon";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
  handleUnlockAccount: () => void;
  onAfterSubmit: () => void;
};

export default function DialogSendFunds({ pair, isOpen, onClose, handleUnlockAccount, onAfterSubmit }: IProps) {
  const api = useAtomValue(apiAtom);
  const toaster = useAtomValue(toasterAtom);
  const [canSend, setCanSend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("0");
  const [amountNumber, setAmountNumber] = useState(0);
  const [tokenSymbol, setTokenSymbol] = useState("");

  function handleOnOpening() {
    setIsLoading(false);
    setAddress("");
    setAmount("0");
    setAmountNumber(0);
  }

  function handleAddressChange(e) {
    setAddress(e.target.value);
  }

  function handleAmountChange(valueAsNumber, valueAsString) {
    setAmount(valueAsString);
    setAmountNumber(valueAsNumber);
  }

  useEffect(() => {
    setCanSend(api && isValidAddressPolkadotAddress(address) && amountNumber > 0);
    if (!api) {
      return;
    }
    setTokenSymbol(api.registry.getChainProperties().tokenSymbol.toHuman().toString());
  }, [api, address, amountNumber]);

  async function handleSendClick() {
    if (!api) {
      return;
    }
    setIsLoading(true);
    try {
      if (pair.isLocked) {
        handleUnlockAccount();
        return;
      }
      const toSend = amountNumber * 1_000_000_000_000;
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

  const addressIcon = isValidAddressPolkadotAddress(address) ? <AddressIcon address={address} className="m-2" /> : <Icon icon="asterisk" />;

  return (
    <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} onClose={onClose} className="w-[90%] sm:w-[640px]">
      <div className={Classes.DIALOG_BODY}>
        <InputGroup
          disabled={isLoading}
          large={true}
          className="font-mono mb-2"
          spellCheck={false}
          placeholder="Enter address to send to"
          onChange={handleAddressChange}
          value={address}
          leftElement={addressIcon}
        />
        <NumericInput
          disabled={isLoading}
          selectAllOnFocus={true}
          buttonPosition={null}
          className="mb-2"
          large={true}
          leftIcon="send-to"
          placeholder="Amount"
          onValueChange={handleAmountChange}
          value={amount}
          fill={true}
          min={0}
          minorStepSize={0.001}
          rightElement={<Tag minimal={true}>{tokenSymbol}</Tag>}
        />
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose} text="Cancel" disabled={isLoading} />
          <Button
            intent={Intent.PRIMARY}
            disabled={isLoading || !canSend}
            onClick={handleSendClick}
            icon="send-message"
            loading={isLoading}
            text="Send"
          />
        </div>
      </div>
    </Dialog>
  );
}
