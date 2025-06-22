import { Alert, Intent } from "@blueprintjs/core";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import DialogAddMiner from "../dialogs/DialogAddMiner";
import DialogClosePool from "../dialogs/DialogClosePool";
import DialogIdentity from "../dialogs/DialogIdentity";
import DialogJoinPool from "../dialogs/DialogJoinPool";
import DialogLeavePool from "../dialogs/DialogLeavePool";
import DialogLockFunds from "../dialogs/DialogLockFunds";
import DialogRemoveMiner from "../dialogs/DialogRemoveMiner";
import DialogSendFunds from "../dialogs/DialogSendFunds";
import DialogSetPoolDifficulty from "../dialogs/DialogSetPoolDifficulty";
import DialogSetPoolInterest from "../dialogs/DialogSetPoolInterest";
import DialogSignAndVerify from "../dialogs/DialogSignVerify";
import DialogUnlockAccount from "../dialogs/DialogUnlockAccount";
import DialogJudgementRequests from "../dialogs/DialogJudgementRequests";
import DialogSetRegistrarFee from "../dialogs/DialogSetRegistrarFee";
import DialogEvmWithdraw from "../dialogs/DialogEvmWithdraw";

// Add this type definition at the top of the file
type DialogNames =
  | "delete"
  | "send"
  | "unlock"
  | "lock_funds"
  | "sign_verify"
  | "close_pool"
  | "set_pool_interest"
  | "set_pool_difficulty"
  | "join_pool"
  | "leave_pool"
  | "identity"
  | "remove_miner"
  | "add_miner"
  | "judgement_requests"
  | "set_registrar_fee"
  | "evm_withdraw";

interface AccountDialogsProps {
  pair: KeyringPair;
  dialogs: Record<DialogNames, boolean>;
  onDialogToggle: (name: DialogNames) => void;
  onDelete: () => void;
  hasIdentity: boolean;
  isRegistrar: boolean;
  selectedAsset?: {
    id: string;
    metadata?: {
      decimals: string;
      symbol: string;
    };
  };
}

export function AccountDialogs({
  pair,
  dialogs,
  onDialogToggle,
  onDelete,
  hasIdentity,
  isRegistrar,
  selectedAsset,
}: AccountDialogsProps) {
  const { t } = useTranslation();

  const createToggleHandler = useCallback(
    (name: DialogNames) => () => onDialogToggle(name),
    [onDialogToggle]
  );

  const handleToggleDelete = createToggleHandler("delete");
  const handleToggleSend = createToggleHandler("send");
  const handleToggleUnlock = createToggleHandler("unlock");
  const handleToggleLockFunds = createToggleHandler("lock_funds");
  const handleToggleSignVerify = createToggleHandler("sign_verify");
  const handleToggleClosePool = createToggleHandler("close_pool");
  const handleToggleSetPoolInterest = createToggleHandler("set_pool_interest");
  const handleToggleSetPoolDifficulty =
    createToggleHandler("set_pool_difficulty");
  const handleToggleJoinPool = createToggleHandler("join_pool");
  const handleToggleLeavePool = createToggleHandler("leave_pool");
  const handleToggleIdentity = createToggleHandler("identity");
  const handleToggleJudgementRequests =
    createToggleHandler("judgement_requests");
  const handleToggleSetRegistrarFee = createToggleHandler("set_registrar_fee");
  const handleToggleRemoveMiner = createToggleHandler("remove_miner");
  const handleToggleAddMiner = createToggleHandler("add_miner");
  const handleToggleEvmWithdraw = createToggleHandler("evm_withdraw");

  return (
    <>
      <Alert
        cancelButtonText={t("commons.lbl_btn_cancel")}
        confirmButtonText={t("commons.lbl_btn_delete")}
        icon="cross"
        intent={Intent.DANGER}
        isOpen={dialogs.delete}
        canEscapeKeyCancel
        canOutsideClickCancel
        onCancel={handleToggleDelete}
        onConfirm={onDelete}
      >
        <p>
          {t("messages.lbl_delete_confirmation_1")}{" "}
          <code className="block my-3">{pair?.address}</code>{" "}
          {t("messages.lbl_delete_confirmation_2")}
        </p>
      </Alert>
      <DialogSendFunds
        pair={pair}
        isOpen={dialogs.send}
        onAfterSubmit={handleToggleSend}
        onClose={handleToggleSend}
        assetId={selectedAsset?.id}
        assetMetadata={selectedAsset?.metadata}
      />
      <DialogUnlockAccount
        pair={pair}
        isOpen={dialogs.unlock}
        onClose={handleToggleUnlock}
      />
      <DialogLockFunds
        pair={pair}
        isOpen={dialogs.lock_funds}
        onAfterSubmit={handleToggleLockFunds}
        onClose={handleToggleLockFunds}
      />
      <DialogSignAndVerify
        isOpen={dialogs.sign_verify}
        onClose={handleToggleSignVerify}
        pair={pair}
      />
      <DialogClosePool
        isOpen={dialogs.close_pool}
        onClose={handleToggleClosePool}
        pair={pair}
      />
      <DialogSetPoolInterest
        isOpen={dialogs.set_pool_interest}
        onClose={handleToggleSetPoolInterest}
        pair={pair}
      />
      <DialogSetPoolDifficulty
        isOpen={dialogs.set_pool_difficulty}
        onClose={handleToggleSetPoolDifficulty}
        pair={pair}
      />
      <DialogJoinPool
        isOpen={dialogs.join_pool}
        onClose={handleToggleJoinPool}
        pair={pair}
      />
      <DialogLeavePool
        isOpen={dialogs.leave_pool}
        onClose={handleToggleLeavePool}
        pair={pair}
      />
      <DialogIdentity
        isOpen={dialogs.identity}
        onClose={handleToggleIdentity}
        pair={pair}
        hasIdentity={hasIdentity}
        isRegistrar={isRegistrar}
      />
      {isRegistrar && (
        <DialogJudgementRequests
          isOpen={dialogs.judgement_requests}
          onClose={handleToggleJudgementRequests}
          registrarPair={pair}
        />
      )}
      {isRegistrar && (
        <DialogSetRegistrarFee
          isOpen={dialogs.set_registrar_fee}
          onClose={handleToggleSetRegistrarFee}
          registrarPair={pair}
        />
      )}
      <DialogRemoveMiner
        isOpen={dialogs.remove_miner}
        onClose={handleToggleRemoveMiner}
        pair={pair}
      />
      <DialogAddMiner
        isOpen={dialogs.add_miner}
        onClose={handleToggleAddMiner}
        pair={pair}
      />
      <DialogEvmWithdraw
        isOpen={dialogs.evm_withdraw}
        onClose={handleToggleEvmWithdraw}
        pair={pair}
      />
    </>
  );
}
