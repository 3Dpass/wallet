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
  const [tokenSymbol, setTokenSymbol] = useState("");

  const dataInitial = {
    address: "",
    amount: "",
    amount_number: 0,
  };
  const [data, setData] = useState(dataInitial);

  function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
  }

  function handleAmountChange(valueAsNumber, valueAsString) {
    setData((prev) => ({ ...prev, amount: valueAsString, amount_number: valueAsNumber }));
  }

  useEffect(() => {
    api && setTokenSymbol(api.registry.getChainProperties().tokenSymbol.toHuman().toString());
  }, [api]);

  useEffect(() => {
    api && setCanSend(isValidAddressPolkadotAddress(data.address) && data.amount_number > 0);
  }, [api, data]);

  async function handleSendClick() {
    if (!api) {
      return;
    }
    setIsLoading(true);
    try {
      if (pair.isLocked) {
        try {
          // unlock with empty password
          pair.unlock();
        } catch (error) {
          handleUnlockAccount();
          return;
        }
      }
      const toSend = BigInt(data.amount_number * 1_000_000_000_000);
      await api.tx.balances.transfer(data.address, toSend).signAndSend(pair);
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

  const addressIcon = isValidAddressPolkadotAddress(data.address) ? <AddressIcon address={data.address} className="m-2" /> : <Icon icon="asterisk" />;

  return (
    <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} onClose={onClose} className="w-[90%] sm:w-[640px]">
      <div className={Classes.DIALOG_BODY}>
        <InputGroup
          disabled={isLoading}
          large={true}
          className="font-mono mb-2"
          spellCheck={false}
          placeholder="Enter address to send to"
          onChange={(e) => setData((prev) => ({ ...prev, address: e.target.value }))}
          value={data.address}
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
          value={data.amount}
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
