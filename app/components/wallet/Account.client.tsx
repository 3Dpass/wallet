import { Alert, Button, Card, Icon, Intent, Spinner, SpinnerSize } from "@blueprintjs/core";
import { useAtomValue } from "jotai";
import { apiAtom, toasterAtom } from "../../atoms";
import { useCallback, useEffect, useState } from "react";
import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import DialogUnlockAccount from "../dialogs/DialogUnlockAccount";
import DialogSendFunds from "../dialogs/DialogSendFunds";
import keyring from "@polkadot/ui-keyring";
import { FormattedAmount } from "../common/FormattedAmount";
import { useIsMainnet } from "../hooks";
import { AddressItem } from "../common/AddressItem";

type IProps = {
  pair: KeyringPair;
};

export default function Account({ pair }: IProps) {
  const api = useAtomValue(apiAtom);
  const toaster = useAtomValue(toasterAtom);
  const isMainnet = useIsMainnet();
  const [balances, setBalances] = useState<DeriveBalancesAll | undefined>(undefined);

  const dialogsInitial = {
    send: false,
    delete: false,
    unlock: false,
  };
  const [dialogs, setDialogs] = useState(dialogsInitial);
  const dialogToggle = useCallback((name: keyof typeof dialogsInitial) => {
    setDialogs((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  useEffect(() => {
    loadAccount();
  }, [api]);

  function loadAccount() {
    if (!api) {
      return;
    }
    setBalances(undefined);
    api.derive.balances.all(pair.address).then((balances) => {
      setBalances(balances);
    });
  }

  function handleUnlockAccount() {
    dialogToggle("unlock");
  }

  function handleAddressDelete() {
    keyring.forgetAccount(pair.address);
    dialogToggle("delete");
  }

  async function handleCopyAddress() {
    await navigator.clipboard.writeText(pair.address);
    toaster &&
      toaster.show({
        icon: "tick",
        intent: Intent.SUCCESS,
        message: "Address copied to clipboard",
      });
  }

  async function handleCopyJson() {
    if (pair.isLocked) {
      handleUnlockAccount();
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(pair.toJson()));
    toaster &&
      toaster?.show({
        icon: "tick",
        intent: Intent.SUCCESS,
        message: "Wallet JSON copied to clipboard",
      });
  }

  async function handleUnlockFundsClick() {
    if (!api) {
      return;
    }
    try {
      if (pair.isLocked) {
        handleUnlockAccount();
        return;
      }
      if (isMainnet) {
        await api.tx.rewards.unlock().signAndSend(pair);
      } else {
        await api.tx.rewards.unlock(pair.address).signAndSend(pair);
      }
      toaster &&
        toaster.show({
          icon: "tick",
          intent: Intent.SUCCESS,
          message: "Unlock request sent",
        });
    } catch (e) {
      toaster &&
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: e.message,
        });
    }
  }

  const dialogElements = (
    <>
      <DialogSendFunds
        pair={pair}
        isOpen={dialogs.send}
        onAfterSubmit={() => dialogToggle("send")}
        handleUnlockAccount={handleUnlockAccount}
        onClose={() => dialogToggle("send")}
      />
      <Alert
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        icon="cross"
        intent={Intent.DANGER}
        isOpen={dialogs.delete}
        canEscapeKeyCancel={true}
        canOutsideClickCancel={true}
        onCancel={() => dialogToggle("delete")}
        onConfirm={handleAddressDelete}
      >
        <p>
          Are you sure you want to delete address <code className="block my-3">{pair?.address}</code> from wallet?
        </p>
      </Alert>
      <DialogUnlockAccount pair={pair} isOpen={dialogs.unlock} onClose={() => dialogToggle("unlock")} />
    </>
  );

  return (
    <Card>
      {dialogElements}
      <AddressItem address={pair.address} />
      <div className="grid gap-1 mt-4">
        <div className="grid grid-cols-3 gap-1 opacity-50">
          <Button icon="duplicate" text="Copy Address" onClick={handleCopyAddress} />
          <Button icon="export" text="Copy JSON" onClick={handleCopyJson} />
          <Button icon="delete" text="Remove" onClick={() => dialogToggle("delete")} />
        </div>
        {!balances && <Spinner size={SpinnerSize.SMALL} className="my-5" />}
        {balances && (
          <>
            <div className="grid grid-cols-3 gap-1 py-2">
              <div>
                <Icon icon="cube-add" className="mr-2 opacity-50" />
                Total balance:{" "}
                <strong>
                  <FormattedAmount value={balances.freeBalance} />
                </strong>
              </div>
              <div>
                <Icon icon="cube" className="mr-2 opacity-50" />
                Transferable:{" "}
                <strong>
                  <FormattedAmount value={balances.availableBalance} />
                </strong>
              </div>
              <div>
                <Icon icon="lock" className="mr-2 opacity-50" />
                Locked:{" "}
                <strong>
                  <FormattedAmount value={balances.lockedBalance} />
                </strong>
              </div>
            </div>
            <Button icon="send-to" text="Send funds..." onClick={() => dialogToggle("send")} />
            {balances.lockedBalance.toBigInt() > 0 && (
              <>
                <Button icon="unlock" text="Unlock funds mined" onClick={handleUnlockFundsClick} />
              </>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
