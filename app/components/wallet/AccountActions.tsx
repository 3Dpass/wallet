import { MenuItem } from "@blueprintjs/core";
import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useTranslation } from "react-i18next";

type AccountActionsProps = {
  pair: KeyringPair;
  balances: DeriveBalancesAll;
  accountLocked: boolean;
  onSignVerify: () => void;
  onUnlockFunds: () => void;
  onLockFunds: () => void;
  onDelete: () => void;
  onIdentity: () => void;
  onCopyAddress: () => void;
  isRegistrar: boolean;
  hasIdentity: boolean;
};

export function AccountActions({
  pair,
  balances,
  accountLocked,
  onSignVerify,
  onUnlockFunds,
  onLockFunds,
  onDelete,
  onIdentity,
  onCopyAddress,
  isRegistrar,
  hasIdentity,
}: AccountActionsProps) {
  const { t } = useTranslation();

  return (
    <>
      <MenuItem
        icon="duplicate"
        text={t("commons.lbl_btn_copy")}
        onClick={onCopyAddress}
      />
      <MenuItem
        icon="endorsed"
        text={t("root.lbl_btn_sign_verify")}
        onClick={onSignVerify}
        disabled={accountLocked}
      />
      <MenuItem
        icon="unlock"
        text={t("root.lbl_btn_unlock")}
        onClick={onUnlockFunds}
        disabled={balances?.lockedBalance.toBigInt() <= 0 || accountLocked}
      />
      <MenuItem
        icon="lock"
        text={t("root.lbl_btn_lock")}
        onClick={onLockFunds}
        disabled={accountLocked}
      />
      {!pair.meta.isInjected && (
        <MenuItem
          icon="trash"
          text={t("root.lbl_btn_remove")}
          intent="danger"
          onClick={onDelete}
        />
      )}
      {!accountLocked && (
        <MenuItem
          icon={hasIdentity ? "endorsed" : "id-number"}
          text={
            isRegistrar
              ? t("root.lbl_judgements_requests")
              : t("root.lbl_identity")
          }
          onClick={onIdentity}
        />
      )}
    </>
  );
}
