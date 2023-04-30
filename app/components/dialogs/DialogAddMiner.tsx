import { Button, Classes, Dialog, Icon, InputGroup, Intent } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";
import { isValidPolkadotAddress } from "../../utils/address";
import { AddressIcon } from "../common/AddressIcon";
import type { SignerOptions } from "@polkadot/api/types";
import { signAndSend } from "../../utils/sign";
import useApi from "../../hooks/useApi";
import useToaster from "../../hooks/useToaster";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogAddMiner({ pair, isOpen, onClose }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState("");

  function handleOnOpening() {
    setIsLoading(false);
  }

  useEffect(() => {
    setCanSubmit(api !== undefined && isValidPolkadotAddress(data));
  }, [api, data]);

  async function handleSubmitClick() {
    if (!api) {
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "Account is locked",
      });
      return;
    }
    setIsLoading(true);
    try {
      const tx = api.tx.miningPool.addMember(data);
      const options: Partial<SignerOptions> = {};
      await signAndSend(tx, pair, options);
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: "The member was added to the mining pool",
      });
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
    } finally {
      setIsLoading(false);
      onClose();
    }
  }

  const addressIcon = isValidPolkadotAddress(data) ? <AddressIcon address={data} className="m-2" /> : <Icon icon="asterisk" />;

  return (
    <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} onClose={onClose} className="w-[90%] sm:w-[640px]">
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        <InputGroup
          disabled={isLoading}
          large={true}
          className="font-mono"
          spellCheck={false}
          placeholder="Enter a miner address"
          onChange={(e) => setData(e.target.value)}
          value={data}
          leftElement={addressIcon}
        />
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
            text="Add a miner"
          />
        </div>
      </div>
    </Dialog>
  );
}
