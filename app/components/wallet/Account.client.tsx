import { Alert, Button, Card, Elevation, Icon, Intent, Spinner, SpinnerSize } from "@blueprintjs/core";
import { useAtomValue } from "jotai";
import { apiAtom, toasterAtom } from "../../atoms";
import { useCallback, useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";
import DialogUnlockAccount from "../dialogs/DialogUnlockAccount";
import DialogSendFunds from "../dialogs/DialogSendFunds";
import keyring from "@polkadot/ui-keyring";
import { FormattedAmount } from "../common/FormattedAmount";
import { useIsMainnet } from "../hooks";
import { AddressItem } from "../common/AddressItem";
import TitledValue from "../common/TitledValue";
import DialogLockFunds from "../dialogs/DialogLockFunds";
import DialogSignAndVerify from "../dialogs/DialogSignVerify";
import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import { signAndSend } from "../../utils/sign";

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
    lock_funds: false,
    sign_verify: false,
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
    if (!api) {
      return;
    }
    try {
      let tx;
      if (isMainnet) {
        tx = api.tx.rewards.unlock();
      } else {
        tx = api.tx.rewards.unlock(pair.address);
      }
      await signAndSend(tx, pair);
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

  async function handleLockFundsClick() {
    dialogToggle("lock_funds");
  }

  function handleSignVerify() {
    dialogToggle("sign_verify");
  }

  const dialogElements = (
    <>
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
      <DialogSendFunds pair={pair} isOpen={dialogs.send} onAfterSubmit={() => dialogToggle("send")} onClose={() => dialogToggle("send")} />
      <DialogUnlockAccount pair={pair} isOpen={dialogs.unlock} onClose={() => dialogToggle("unlock")} />
      <DialogLockFunds
        pair={pair}
        isOpen={dialogs.lock_funds}
        onAfterSubmit={() => dialogToggle("lock_funds")}
        onClose={() => dialogToggle("lock_funds")}
      />
      <DialogSignAndVerify isOpen={dialogs.sign_verify} onClose={() => dialogToggle("sign_verify")} pair={pair} />
    </>
  );

  return (
    <Card elevation={Elevation.ZERO} className="relative pt-9 pb-4">
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
            {pair.isLocked && !pair.meta.isInjected && (
              <div className="my-2 text-center">
                Account is <Icon icon="lock" /> password protected, you need to{" "}
                <a href="#" onClick={handleUnlockAccount} className="text-white underline underline-offset-4">
                  unlock it
                </a>{" "}
                before use
              </div>
            )}
            <div className="grid grid-cols-3 gap-1">
              <Button icon="send-to" text="Send..." onClick={() => dialogToggle("send")} disabled={pair.isLocked && !pair.meta.isInjected} />
              <Button icon="duplicate" text="Copy" onClick={handleCopyAddress} />
              <Button icon="endorsed" text="Sign & Verify" onClick={handleSignVerify} disabled={pair.isLocked && !pair.meta.isInjected} />
            </div>
            <div className="grid grid-cols-4 gap-1">
              {!pair.meta.isInjected && (
                <>
                  <Button
                    icon="unlock"
                    text="Unlock"
                    onClick={handleUnlockFundsClick}
                    disabled={balances.lockedBalance.toBigInt() <= 0 || (pair.isLocked && !pair.meta.isInjected)}
                  />
                  <Button icon="lock" text="Lock..." onClick={handleLockFundsClick} disabled={pair.isLocked && !pair.meta.isInjected} />
                  <Button icon="export" text="JSON" onClick={handleCopyJson} disabled={pair.isLocked} />
                  <Button icon="delete" text="Remove" onClick={() => dialogToggle("delete")} />
                </>
              )}
            </div>
          </>
        )}
      </div>
      {pair.meta.isInjected && (
        <div className="absolute top-0 right-0 text-xs px-2 py-1 bg-gray-600 rounded-bl text-gray-400">
          {pair.meta.name && (
            <span>
              <span className="font-bold text-white">{pair.meta.name as string}</span> —{" "}
            </span>
          )}
          extension
        </div>
      )}
    </Card>
  );
}
