import { Button, Classes, Dialog, Icon, InputGroup, Intent } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import type { KeyringPair } from "@polkadot/keyring/types";
import { apiAtom, toasterAtom } from "../../atoms";
import { isValidPolkadotAddress } from "../../utils/address";
import { AddressIcon } from "../common/AddressIcon";
import AmountInput from "../common/AmountInput";
import type { SignerOptions } from "@polkadot/api/types";
import { web3FromAddress } from "@polkadot/extension-dapp/bundle";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
  onAfterSubmit: () => void;
};

export default function DialogSendFunds({ pair, isOpen, onClose, onAfterSubmit }: IProps) {
  const api = useAtomValue(apiAtom);
  const toaster = useAtomValue(toasterAtom);
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dataInitial = {
    address: "",
    amount: "",
    amount_number: 0,
    tips: "",
    tips_number: 0,
  };
  const [data, setData] = useState(dataInitial);

  function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
  }

  function handleAmountChange(valueAsNumber, valueAsString) {
    setData((prev) => ({ ...prev, amount: valueAsString, amount_number: valueAsNumber }));
  }

  function handleTipsChange(valueAsNumber, valueAsString) {
    setData((prev) => ({ ...prev, tips: valueAsString, tips_number: valueAsNumber }));
  }

  useEffect(() => {
    api && setCanSubmit(isValidPolkadotAddress(data.address) && data.amount_number > 0);
  }, [api, data]);

  async function handleSubmitClick() {
    if (!api) {
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster &&
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: "Account is locked",
        });
      return;
    }
    setIsLoading(true);
    try {
      const value = BigInt(data.amount_number * 1_000_000_000_000);
      const tips = BigInt(data.tips_number * 1_000_000_000_000);
      const tx = api.tx.balances.transfer(data.address, value);
      const options: Partial<SignerOptions> = {};
      if (tips > 0) {
        options.tip = tips.toString();
      }
      if (pair.meta.isInjected) {
        const injected = await web3FromAddress(pair.address);
        options.signer = injected.signer;
      }
      await tx.signAndSend(pair.address, options);
      toaster &&
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: "Send request submitted",
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

  const addressIcon = isValidPolkadotAddress(data.address) ? <AddressIcon address={data.address} className="m-2" /> : <Icon icon="asterisk" />;

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
        <AmountInput disabled={isLoading} onValueChange={handleAmountChange} />
        <AmountInput disabled={isLoading} onValueChange={handleTipsChange} placeholder="Enter optional tips to increase transaction priority" />
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose} text="Cancel" disabled={isLoading} />
          <Button
            intent={Intent.PRIMARY}
            disabled={isLoading || !canSubmit}
            onClick={handleSubmitClick}
            icon="send-message"
            loading={isLoading}
            text="Send"
          />
        </div>
      </div>
    </Dialog>
  );
}
