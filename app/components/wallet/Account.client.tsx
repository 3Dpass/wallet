import { Alert, Button, Card, Elevation, Icon, Intent, Spinner, SpinnerSize } from "@blueprintjs/core";
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
import TitledValue from "../common/TitledValue";

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
      try {
        pair.unlock();
      } catch {
        // pair is password protected
      }
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
    if (!api || pair.isLocked) {
      return;
    }
    try {
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
      <DialogSendFunds pair={pair} isOpen={dialogs.send} onAfterSubmit={() => dialogToggle("send")} onClose={() => dialogToggle("send")} />
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

  const accountLockedClass = pair.isLocked ? "opacity-50 pointer-events-none" : "";

  return (
    <Card elevation={Elevation.TWO}>
      {dialogElements}
      <AddressItem address={pair.address} />
      <div className="grid gap-1">
        {!balances && <Spinner size={SpinnerSize.SMALL} className="my-5" />}
        {balances && (
          <>
            <div className="grid grid-cols-3 gap-1 py-2">
              <TitledValue title="Total balance" value={<FormattedAmount value={balances.freeBalance} />} />
              <TitledValue title="Transferable" value={<FormattedAmount value={balances.availableBalance} />} />
              <TitledValue title="Locked" value={<FormattedAmount value={balances.lockedBalance} />} />
            </div>
            {pair.isLocked && (
              <div className="my-2 text-center">
                Account is <Icon icon="lock" /> password protected, you need to{" "}
                <a href="#" onClick={handleUnlockAccount} className="text-white underline underline-offset-2">
                  unlock it
                </a>{" "}
                before use
              </div>
            )}
            <div className={`grid grid-cols-2 gap-1 ${accountLockedClass}`}>
              <Button icon="send-to" text="Send funds..." onClick={() => dialogToggle("send")} />
              <Button icon="unlock" text="Unlock mined" onClick={handleUnlockFundsClick} disabled={balances.lockedBalance.toBigInt() <= 0} />
            </div>
          </>
        )}
        <div className="grid grid-cols-3 gap-1">
          <Button icon="duplicate" text="Copy Address" onClick={handleCopyAddress} />
          <Button icon="export" text="Copy JSON" onClick={handleCopyJson} className={accountLockedClass} />
          <Button icon="delete" text="Remove" onClick={() => dialogToggle("delete")} />
        </div>
      </div>
    </Card>
  );
}
