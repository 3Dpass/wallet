import { Alert, Button, Classes, Icon, IconSize, Intent, Spinner, SpinnerSize, Text, Tooltip } from "@blueprintjs/core";
import { useCallback, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { poolIdsAtom } from "../../atoms";
import type { IPalletIdentityRegistrarInfo } from "../common/UserCard";
import type { KeyringPair } from "@polkadot/keyring/types";
import DialogUnlockAccount from "../dialogs/DialogUnlockAccount";
import DialogSendFunds from "../dialogs/DialogSendFunds";
import keyring from "@polkadot/ui-keyring";
import { FormattedAmount } from "../common/FormattedAmount";
import { AccountName } from "../common/AccountName";
import TitledValue from "../common/TitledValue";
import DialogLockFunds from "../dialogs/DialogLockFunds";
import DialogSignAndVerify from "../dialogs/DialogSignVerify";
import DialogClosePool from "../dialogs/DialogClosePool";
import DialogSetPoolInterest from "../dialogs/DialogSetPoolInterest";
import DialogSetPoolDifficulty from "../dialogs/DialogSetPoolDifficulty";
import DialogJoinPool from "../dialogs/DialogJoinPool";
import DialogLeavePool from "../dialogs/DialogLeavePool";
import DialogIdentity from "../dialogs/DialogIdentity";
import DialogRemoveMiner from "../dialogs/DialogRemoveMiner";
import DialogAddMiner from "../dialogs/DialogAddMiner";
import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import { signAndSend } from "../../utils/sign";
import useToaster from "../../hooks/useToaster";
import { useApi } from "../Api";
import { useTranslation } from "react-i18next";
import PoolActions from "./PoolActions";

type IProps = {
  pair: KeyringPair;
};

export default function Account({ pair }: IProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [balances, setBalances] = useState<DeriveBalancesAll | undefined>(undefined);
  const [poolIds, setPoolIds] = useAtom(poolIdsAtom);
  const poolAlreadyExist = poolIds.includes(pair.address);

  const [isCreatePoolLoading, setIsCreatePoolLoading] = useState(false);
  const [hasIdentity, setHasIdentity] = useState(false);
  const [isRegistrar, setIsRegistrar] = useState(false);

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
    add_miner: false,
    remove_miner: false,
  };
  const [dialogs, setDialogs] = useState(dialogsInitial);
  const dialogToggle = useCallback((name: keyof typeof dialogsInitial) => {
    setDialogs((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const showError = useCallback(
    (message: string) => {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message,
      });
    },
    [toaster]
  );

  async function sendSetPoolMode(newMode: boolean): Promise<void> {
    if (!api) {
      return;
    }
    try {
      const tx = api.tx.miningPool.setPoolMode(newMode);
      await signAndSend(tx, pair, {});
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: t("messages.lbl_kyc_changed"),
      });
    } catch (e: any) {
      showError(e.message);
    }
  }

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
    api.query.identity.identityOf(pair.address).then((identityInfo) => {
      if (identityInfo) {
        const identity = identityInfo.toHuman() as IPalletIdentityRegistrarInfo;
        if (identity?.judgements) {
          setHasIdentity(false);
          for (let i = 0; i < identity.judgements.length; i++) {
            if (identity.judgements[i][1].toString() == "Reasonable") {
              setHasIdentity(true);
            }
          }
        }
      }
    });

    api.query.identity.registrars().then((registrarsData) => {
      const registrars: Object[] = registrarsData.toHuman() as Object[];
      if (registrars && Array.isArray(registrars)) {
        registrars.forEach((r, i) => {
          if ((r as IPalletIdentityRegistrarInfo).account == pair.address) {
            setIsRegistrar(true);
            return;
          }
        });
      }
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
      message: t("messages.lbl_address_copied"),
    });
  }, [pair.address, t, toaster]);

  const handleUnlockFundsClick = useCallback(async () => {
    if (!api) {
      return;
    }
    try {
      let tx;
      tx = api.tx.rewards.unlock();
      await signAndSend(tx, pair);
      toaster.show({
        icon: "tick",
        intent: Intent.SUCCESS,
        message: t("messages.lbl_unlock_request_sent"),
      });
    } catch (e: any) {
      showError(e.message);
    }
  }, [api, pair, showError, toaster]);

  async function handleCreatePoolClick() {
    if (!api) {
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      showError(t("messages.lbl_account_locked"));
      return;
    }
    setIsCreatePoolLoading(true);
    try {
      const tx = api.tx.miningPool.createPool();
      const unsub = await signAndSend(tx, pair, {}, ({ status, dispatchError }) => {
        if (!status.isInBlock && !status.isFinalized) {
          return;
        }
        setIsCreatePoolLoading(false);
        unsub();
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            const { docs, name, section } = decoded;
            showError(`${section}.${name}: ${docs.join(" ")}`);
          } else {
            showError(dispatchError.toString());
          }
          setIsCreatePoolLoading(false);
          return;
        }
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: t("messages.lbl_mining_pool_created"),
        });
        setPoolIds([pair.address, ...poolIds]);
      });
      toaster.show({
        icon: "time",
        intent: Intent.PRIMARY,
        message: t("messages.lbl_creating_mining_pool"),
      });
    } catch (e: any) {
      setIsCreatePoolLoading(false);
      showError(e.message);
    }
  }

  const handleLockFundsClick = useCallback(() => {
    dialogToggle("lock_funds");
  }, [dialogToggle]);

  const handleSignVerify = useCallback(() => {
    dialogToggle("sign_verify");
  }, [dialogToggle]);

  const dialogElements = (
    <>
      <Alert
        cancelButtonText={t("commons.lbl_btn_cancel")}
        confirmButtonText={t("commons.lbl_btn_delete")}
        icon="cross"
        intent={Intent.DANGER}
        isOpen={dialogs.delete}
        canEscapeKeyCancel
        canOutsideClickCancel
        onCancel={() => dialogToggle("delete")}
        onConfirm={handleAddressDelete}
      >
        <p>
          {t("messages.lbl_delete_confirmation_1")} <code className="block my-3">{pair?.address}</code> {t("messages.lbl_delete_confirmation_2")}
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
      <DialogClosePool isOpen={dialogs.close_pool} onClose={() => dialogToggle("close_pool")} pair={pair} />
      <DialogSetPoolInterest isOpen={dialogs.set_pool_interest} onClose={() => dialogToggle("set_pool_interest")} pair={pair} />
      <DialogSetPoolDifficulty isOpen={dialogs.set_pool_difficulty} onClose={() => dialogToggle("set_pool_difficulty")} pair={pair} />
      <DialogJoinPool isOpen={dialogs.join_pool} onClose={() => dialogToggle("join_pool")} pair={pair} />
      <DialogLeavePool isOpen={dialogs.leave_pool} onClose={() => dialogToggle("leave_pool")} pair={pair} />
      <DialogIdentity
        isOpen={dialogs.identity}
        onClose={() => dialogToggle("identity")}
        pair={pair}
        hasIdentity={hasIdentity}
        isRegistrar={isRegistrar}
      />
      <DialogRemoveMiner isOpen={dialogs.remove_miner} onClose={() => dialogToggle("remove_miner")} pair={pair} />
      <DialogAddMiner isOpen={dialogs.add_miner} onClose={() => dialogToggle("add_miner")} pair={pair} />
    </>
  );

  const accountLocked: boolean = pair.isLocked && !pair.meta.isInjected;

  return (
    <div className="relative p-3 text-sm border-b border-l border-gray-600">
      {dialogElements}
      <div className="pr-12">
        <AccountName address={pair.address} />
      </div>
      <div className="grid gap-1">
        {!balances && <Spinner size={SpinnerSize.SMALL} className="my-5" />}
        {balances && (
          <>
            <div className="grid grid-cols-3 gap-1 py-2">
              <TitledValue title={t("root.lbl_total_balance")} fontMono fontSmall value={<FormattedAmount value={balances.freeBalance.toBigInt()} />} />
              <TitledValue
                title={t("root.lbl_transferable")}
                fontMono
                fontSmall
                value={<FormattedAmount value={balances.availableBalance.toBigInt()} />}
              />
              <TitledValue title={t("root.lbl_locked")} fontMono fontSmall value={<FormattedAmount value={balances.lockedBalance.toBigInt()} />} />
            </div>
            {accountLocked && (
              <div className="my-2 text-center">
                {t("root.lbl_account_is_password_protected_1")} <Icon icon="lock" /> {t("root.lbl_account_is_password_protected_2")}{" "}
                <span onClick={handleUnlockAccount} className="text-white underline underline-offset-4 cursor-pointer">
                  {t("root.lbl_account_is_password_protected_3")}
                </span>{" "}
                {t("root.lbl_account_is_password_protected_4")}
              </div>
            )}
            <div className="grid grid-cols-3 gap-1">
              <Button className="text-xs" icon="send-to" text={t("root.lbl_btn_send")} onClick={() => dialogToggle("send")} disabled={accountLocked} />
              <Button className="text-xs" icon="endorsed" text={t("root.lbl_btn_sign_verify")} onClick={handleSignVerify} disabled={accountLocked} />
              <Button
                className="text-xs"
                icon="unlock"
                text={t("root.lbl_btn_unlock")}
                onClick={handleUnlockFundsClick}
                disabled={balances.lockedBalance.toBigInt() <= 0 || accountLocked}
              />
              <Button className="text-xs" icon="lock" text={t("root.lbl_btn_lock")} onClick={handleLockFundsClick} disabled={accountLocked} />
              {!pair.meta.isInjected && (
                <>
                  <Button className="text-xs" icon="delete" text={t("root.lbl_btn_remove")} onClick={() => dialogToggle("delete")} />
                </>
              )}
              {!accountLocked && (
                <div className="flex items-center justify-center gap-1 cursor-pointer group" onClick={() => dialogToggle("identity")}>
                  {isRegistrar ? (
                    <span className="font-bold underline underline-offset-2 text-center text-xs">{t("root.lbl_judgements_requests")}&nbsp;&rarr;</span>
                  ) : (
                    <>
                      <span className="group-hover:underline underline-offset-2 text-xs">{t("root.lbl_identity")}:</span>
                      {hasIdentity ? (
                        <Icon className={`${Classes.ICON} ${Classes.INTENT_SUCCESS} `} icon="endorsed" size={IconSize.STANDARD} />
                      ) : (
                        <span className="font-bold underline underline-offset-2 text-xs">{t("root.lbl_identity_not_claimed")} &rarr;</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <PoolActions
              pair={pair}
              poolAlreadyExist={poolAlreadyExist}
              accountLocked={accountLocked}
              isCreatePoolLoading={isCreatePoolLoading}
              onCreatePool={handleCreatePoolClick}
              onSetPoolMode={sendSetPoolMode}
              onDialogToggle={dialogToggle}
            />
          </>
        )}
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {Boolean(pair.meta.isInjected) && (
          <Tooltip
            position="bottom"
            content={
              <div>
                {pair.meta.name && <div className="font-bold">{pair.meta.name as string}</div>}
                <div>{t("commons.lbl_loaded_from_extension")}</div>
              </div>
            }
          >
            <Icon icon="intersection" size={14} className="opacity-50" />
          </Tooltip>
        )}
        <Icon
          icon="duplicate"
          size={14}
          className="opacity-50 hover:opacity-100 cursor-pointer"
          onClick={handleCopyAddress}
          title={t("commons.lbl_btn_copy")}
        />
      </div>
    </div>
  );
}
