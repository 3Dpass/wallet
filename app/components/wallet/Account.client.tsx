import { Alert, Button, Card, Classes, Elevation, Icon, IconSize, Intent, Spinner, SpinnerSize, Text } from "@blueprintjs/core";
import { useCallback, useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { apiAdvancedModeAtom, poolIdsAtom } from "../../atoms";
import type { KeyringPair } from "@polkadot/keyring/types";
import DialogUnlockAccount from "../dialogs/DialogUnlockAccount";
import DialogSendFunds from "../dialogs/DialogSendFunds";
import keyring from "@polkadot/ui-keyring";
import { FormattedAmount } from "../common/FormattedAmount";
import { AddressItem } from "../common/AddressItem";
import TitledValue from "../common/TitledValue";
import DialogLockFunds from "../dialogs/DialogLockFunds";
import DialogSignAndVerify from "../dialogs/DialogSignVerify";
import DialogCreatePool from "../dialogs/DialogCreatePool";
import DialogClosePool from "../dialogs/DialogClosePool";
import DialogSetPoolInterest from "../dialogs/DialogSetPoolInterest";
import DialogSetPoolDifficulty from "../dialogs/DialogSetPoolDifficulty";
import DialogJoinPool from "../dialogs/DialogJoinPool";
import DialogLeavePool from "../dialogs/DialogLeavePool";
import DialogIdentity from "../dialogs/DialogIdentity";
import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import { signAndSend } from "../../utils/sign";
import useIsMainnet from "../../hooks/useIsMainnet";
import useApi from "../../hooks/useApi";
import useToaster from "../../hooks/useToaster";

type IProps = {
  pair: KeyringPair;
};

export default function Account({ pair }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const isMainnet = useIsMainnet();
  const [balances, setBalances] = useState<DeriveBalancesAll | undefined>(undefined);
  const apiAdvancedMode: boolean = useAtomValue(apiAdvancedModeAtom);
  const poolIds = useAtomValue(poolIdsAtom);
  const poolAlreadyExist = poolIds.includes(pair.address);

  const dialogsInitial = {
    send: false,
    delete: false,
    unlock: false,
    lock_funds: false,
    sign_verify: false,
    create_pool: false,
    set_pool_interest: false,
    set_pool_difficulty: false,
    join_pool: false,
    leave_pool: false,
    close_pool: false,
    identity: false,
  };
  const [dialogs, setDialogs] = useState(dialogsInitial);
  const dialogToggle = useCallback((name: keyof typeof dialogsInitial) => {
    setDialogs((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  useEffect(() => {
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
  }, [api, pair]);

  const handleUnlockAccount = useCallback(() => {
    dialogToggle("unlock");
  }, [dialogToggle]);

  const handleAddressDelete = useCallback(() => {
    keyring.forgetAccount(pair.address);
    dialogToggle("delete");
  }, [dialogToggle, pair]);

  const handleCopyAddress = useCallback(async () => {
    await navigator.clipboard.writeText(pair.address);
    toaster.show({
      icon: "tick",
      intent: Intent.SUCCESS,
      message: "Address copied to clipboard",
    });
  }, [pair, toaster]);

  const handleUnlockFundsClick = useCallback(async () => {
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
      toaster.show({
        icon: "tick",
        intent: Intent.SUCCESS,
        message: "Unlock request sent",
      });
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
    }
  }, [api, isMainnet, pair, toaster]);

  const handleLockFundsClick = useCallback(() => {
    dialogToggle("lock_funds");
  }, [dialogToggle]);

  const handleSignVerify = useCallback(() => {
    dialogToggle("sign_verify");
  }, [dialogToggle]);

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
      <DialogCreatePool isOpen={dialogs.create_pool} onClose={() => dialogToggle("create_pool")} pair={pair} />
      <DialogClosePool isOpen={dialogs.close_pool} onClose={() => dialogToggle("close_pool")} pair={pair} />
      <DialogSetPoolInterest isOpen={dialogs.set_pool_interest} onClose={() => dialogToggle("set_pool_interest")} pair={pair} />
      <DialogSetPoolDifficulty isOpen={dialogs.set_pool_difficulty} onClose={() => dialogToggle("set_pool_difficulty")} pair={pair} />
      <DialogJoinPool isOpen={dialogs.join_pool} onClose={() => dialogToggle("join_pool")} pair={pair} />
      <DialogLeavePool isOpen={dialogs.leave_pool} onClose={() => dialogToggle("leave_pool")} pair={pair} />
      <DialogIdentity isOpen={dialogs.identity} onClose={() => dialogToggle("identity")} pair={pair} />
    </>
  );

  const accountLocked: boolean = pair.isLocked && !pair.meta.isInjected;

  return (
    <Card elevation={Elevation.ZERO} className="relative pt-9 pb-4">
      {dialogElements}
      <AddressItem address={pair.address} />
      <Icon
        className={`${Classes.ICON} ${Classes.INTENT_SUCCESS}`}
        style={{'position': 'absolute', 'right': '0.3rem', 'top': '2.5rem', 'cursor': 'pointer'}}
        icon="endorsed"
        size={IconSize.LARGE}
        onClick={() => dialogToggle("identity")}
      />
      <div className="grid gap-1">
        {!balances && <Spinner size={SpinnerSize.SMALL} className="my-5" />}
        {balances && (
          <>
            <div className="grid grid-cols-3 gap-1 py-2">
              <TitledValue title="Total balance" value={<FormattedAmount value={balances.freeBalance.toBigInt()} />} />
              <TitledValue title="Transferable" value={<FormattedAmount value={balances.availableBalance.toBigInt()} />} />
              <TitledValue title="Locked" value={<FormattedAmount value={balances.lockedBalance.toBigInt()} />} />
            </div>
            {accountLocked && (
              <div className="my-2 text-center">
                Account is <Icon icon="lock" /> password protected, you need to{" "}
                <span onClick={handleUnlockAccount} className="text-white underline underline-offset-4 cursor-pointer">
                  unlock it
                </span>{" "}
                before use
              </div>
            )}
            <div className="grid grid-cols-3 gap-1">
              <Button icon="send-to" text="Send..." onClick={() => dialogToggle("send")} disabled={accountLocked} />
              <Button icon="duplicate" text="Copy" onClick={handleCopyAddress} />
              <Button icon="endorsed" text="Sign & Verify" onClick={handleSignVerify} disabled={accountLocked} />
              <Button icon="unlock" text="Unlock" onClick={handleUnlockFundsClick} disabled={balances.lockedBalance.toBigInt() <= 0 || accountLocked} />
              <Button icon="lock" text="Lock..." onClick={handleLockFundsClick} disabled={accountLocked} />
              {!pair.meta.isInjected && (
                <>
                  <Button icon="delete" text="Remove" onClick={() => dialogToggle("delete")} />
                </>
              )}
            </div>
            {apiAdvancedMode && (
              <>
                <Text className="font-bold pt-4 pb-2">Pool actions</Text>
                <div className="grid grid-cols-3 gap-1">
                  {!poolAlreadyExist && <Button text="Create" onClick={() => dialogToggle("create_pool")} disabled={accountLocked} />}
                  {poolAlreadyExist && <Button text="Close" onClick={() => dialogToggle("close_pool")} disabled={accountLocked} />}
                  <Button text="Set up fee" onClick={() => dialogToggle("set_pool_interest")} disabled={accountLocked || !poolAlreadyExist} />
                  <Button
                    className="text-center"
                    text="Set up difficulty"
                    onClick={() => dialogToggle("set_pool_difficulty")}
                    disabled={accountLocked || !poolAlreadyExist}
                  />
                  <Button text="Join a pool" onClick={() => dialogToggle("join_pool")} disabled={accountLocked} />
                  <Button text="Leave a pool" onClick={() => dialogToggle("leave_pool")} disabled={accountLocked} />
                </div>
              </>
            )}
          </>
        )}
      </div>
      {Boolean(pair.meta.isInjected) && (
        <div className="absolute top-0 right-0 flex gap-1 text-xs px-2 py-1 bg-gray-600 rounded-bl text-gray-400">
          {Boolean(pair.meta.name) && (
            <span>
              <span className="font-bold text-white">{pair.meta.name as string}</span>
            </span>
          )}
          extension
        </div>
      )}
    </Card>
  );
}
