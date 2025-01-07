import { Button, Text } from "@blueprintjs/core";
import { useAtomValue } from "jotai";
import { apiAdvancedModeAtom } from "../../atoms";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useTranslation } from "react-i18next";

type DialogNames =
  | "send"
  | "delete"
  | "unlock"
  | "lock_funds"
  | "sign_verify"
  | "create_pool"
  | "set_pool_interest"
  | "set_pool_difficulty"
  | "join_pool"
  | "leave_pool"
  | "close_pool"
  | "identity"
  | "add_miner"
  | "remove_miner";

type IProps = {
  pair: KeyringPair;
  poolAlreadyExist: boolean;
  accountLocked: boolean;
  isCreatePoolLoading: boolean;
  onCreatePool: () => void;
  onSetPoolMode: (mode: boolean) => void;
  onDialogToggle: (name: DialogNames) => void;
};

export default function PoolActions({
  pair,
  poolAlreadyExist,
  accountLocked,
  isCreatePoolLoading,
  onCreatePool,
  onSetPoolMode,
  onDialogToggle,
}: IProps) {
  const { t } = useTranslation();
  const apiAdvancedMode = useAtomValue(apiAdvancedModeAtom);

  if (!apiAdvancedMode) {
    return null;
  }

  return (
    <>
      <Text className="font-bold pt-4 pb-2">{t("root.lbl_pool_actions")}</Text>
      <div className="grid grid-cols-3 gap-1">
        {!poolAlreadyExist && (
          <Button className="text-xs" text={t("root.lbl_btn_create")} loading={isCreatePoolLoading} onClick={onCreatePool} disabled={accountLocked} />
        )}
        {poolAlreadyExist && (
          <div className="grid grid-cols-2 gap-1">
            <Button className="text-xs" text={t("root.lbl_btn_kyc")} onClick={() => onSetPoolMode(true)} disabled={accountLocked} />
            <Button className="text-xs" text={t("root.lbl_btn_no_kyc")} onClick={() => onSetPoolMode(false)} disabled={accountLocked} />
          </div>
        )}
        {poolAlreadyExist && (
          <Button className="text-xs" text={t("root.lbl_btn_close_pool")} onClick={() => onDialogToggle("close_pool")} disabled={accountLocked} />
        )}
        <Button
          className="text-xs"
          text={t("root.lbl_btn_fee")}
          onClick={() => onDialogToggle("set_pool_interest")}
          disabled={accountLocked || !poolAlreadyExist}
        />
        <Button
          className="text-xs text-center"
          text={t("root.lbl_btn_difficulty")}
          onClick={() => onDialogToggle("set_pool_difficulty")}
          disabled={accountLocked || !poolAlreadyExist}
        />
        {poolAlreadyExist && (
          <Button className="text-xs" text={t("root.lbl_btn_add_miner")} onClick={() => onDialogToggle("add_miner")} disabled={accountLocked} />
        )}
        {poolAlreadyExist && (
          <Button className="text-xs" text={t("root.lbl_btn_remove_miner")} onClick={() => onDialogToggle("remove_miner")} disabled={accountLocked} />
        )}
        {!poolAlreadyExist && <Button text={t("root.lbl_btn_join")} onClick={() => onDialogToggle("join_pool")} disabled={accountLocked} />}
        {!poolAlreadyExist && <Button text={t("root.lbl_btn_leave")} onClick={() => onDialogToggle("leave_pool")} disabled={accountLocked} />}
      </div>
    </>
  );
}
