import { Alert, Intent } from "@blueprintjs/core";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useTranslation } from "react-i18next";
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
        onCancel={() => onDialogToggle("delete")}
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
        onAfterSubmit={() => onDialogToggle("send")}
        onClose={() => onDialogToggle("send")}
        assetId={selectedAsset?.id}
        assetMetadata={selectedAsset?.metadata}
      />
      <DialogUnlockAccount
        pair={pair}
        isOpen={dialogs.unlock}
        onClose={() => onDialogToggle("unlock")}
      />
      <DialogLockFunds
        pair={pair}
        isOpen={dialogs.lock_funds}
        onAfterSubmit={() => onDialogToggle("lock_funds")}
        onClose={() => onDialogToggle("lock_funds")}
      />
      <DialogSignAndVerify
        isOpen={dialogs.sign_verify}
        onClose={() => onDialogToggle("sign_verify")}
        pair={pair}
      />
      <DialogClosePool
        isOpen={dialogs.close_pool}
        onClose={() => onDialogToggle("close_pool")}
        pair={pair}
      />
      <DialogSetPoolInterest
        isOpen={dialogs.set_pool_interest}
        onClose={() => onDialogToggle("set_pool_interest")}
        pair={pair}
      />
      <DialogSetPoolDifficulty
        isOpen={dialogs.set_pool_difficulty}
        onClose={() => onDialogToggle("set_pool_difficulty")}
        pair={pair}
      />
      <DialogJoinPool
        isOpen={dialogs.join_pool}
        onClose={() => onDialogToggle("join_pool")}
        pair={pair}
      />
      <DialogLeavePool
        isOpen={dialogs.leave_pool}
        onClose={() => onDialogToggle("leave_pool")}
        pair={pair}
      />
      <DialogIdentity
        isOpen={dialogs.identity}
        onClose={() => onDialogToggle("identity")}
        pair={pair}
        hasIdentity={hasIdentity}
        isRegistrar={isRegistrar}
      />
      {isRegistrar && (
        <DialogJudgementRequests
          isOpen={dialogs.judgement_requests}
          onClose={() => onDialogToggle("judgement_requests")}
          registrarPair={pair}
        />
      )}
      {isRegistrar && (
        <DialogSetRegistrarFee
          isOpen={dialogs.set_registrar_fee}
          onClose={() => onDialogToggle("set_registrar_fee")}
          registrarPair={pair}
        />
      )}
      <DialogRemoveMiner
        isOpen={dialogs.remove_miner}
        onClose={() => onDialogToggle("remove_miner")}
        pair={pair}
      />
      <DialogAddMiner
        isOpen={dialogs.add_miner}
        onClose={() => onDialogToggle("add_miner")}
        pair={pair}
      />
      <DialogEvmWithdraw
        isOpen={dialogs.evm_withdraw}
        onClose={() => onDialogToggle("evm_withdraw")}
        pair={pair}
      />
    </>
  );
}
