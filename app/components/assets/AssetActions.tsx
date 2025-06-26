import { MenuItem } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";

interface AssetActionsProps {
  assetId: number;
  metadata: { name: string; symbol: string; decimals: number; isFrozen: boolean } | null;
  evmContractAddress: string;
  onFreeze: () => void;
  onThaw: () => void;
  onBurn: () => void;
  onTransferOwnership: () => void;
  onForceTransfer: () => void;
  role: "owner" | "admin" | "issuer" | "freezer";
}

export default function AssetActions({ assetId, metadata, evmContractAddress, onFreeze, onThaw, onBurn, onTransferOwnership, onForceTransfer, role }: AssetActionsProps) {
  const { t } = useTranslation();

  // Role-based permissions
  const canFreezeAsset = role === "owner" || role === "admin";
  const canBurn = role === "owner" || role === "admin";
  const canForceTransfer = role === "owner" || role === "admin";
  const canFreezeAccount = role === "owner" || role === "freezer";
  const canThaw = role === "owner";
  const canTransferOwnership = role === "owner";

  return (
    <>
      {canFreezeAsset && (
        <MenuItem
          icon="snowflake"
          text={t("asset_actions.freeze") || "Freeze Asset"}
          onClick={onFreeze}
        />
      )}
      {canFreezeAccount && (
        <MenuItem
          icon="snowflake"
          text={t("asset_actions.freeze_account") || "Freeze Account"}
          onClick={onFreeze}
        />
      )}
      {canThaw && (
        <MenuItem
          icon="unlock"
          text={t("asset_actions.thaw") || "Thaw"}
          onClick={onThaw}
        />
      )}
      {canBurn && (
        <MenuItem
          icon="remove"
          text={t("asset_actions.burn") || "Burn"}
          onClick={onBurn}
        />
      )}
      {canForceTransfer && (
        <MenuItem
          icon="swap-horizontal"
          text={t("asset_actions.force_transfer") || "Force Transfer"}
          onClick={onForceTransfer}
        />
      )}
      {canTransferOwnership && (
        <MenuItem
          icon="exchange"
          text={t("asset_actions.transfer_ownership") || "Transfer Ownership"}
          onClick={onTransferOwnership}
        />
      )}
    </>
  );
} 