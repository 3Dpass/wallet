import React, { useState, useCallback } from "react";
import BaseDialog from "./BaseDialog";
import { InputGroup, Intent } from "@blueprintjs/core";
import { useApi } from "app/components/Api";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "app/atoms";
import keyring from "@polkadot/ui-keyring";
import { signAndSend } from "app/utils/sign";
import useToaster from "../../hooks/useToaster";
import { useTranslation } from "react-i18next";

interface DialogSetAssetTeamProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number;
}

export default function DialogSetAssetTeam({ isOpen, onClose, assetId }: DialogSetAssetTeamProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [issuer, setIssuer] = useState("");
  const [admin, setAdmin] = useState("");
  const [freezer, setFreezer] = useState("");
  const [loading, setLoading] = useState(false);

  // Memoized callbacks for JSX props
  const handleIssuerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIssuer(e.target.value);
  }, []);

  const handleAdminChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAdmin(e.target.value);
  }, []);

  const handleFreezerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFreezer(e.target.value);
  }, []);

  // Get the KeyringPair for the selected account
  const pair = (() => {
    try {
      if (selectedAccount && selectedAccount.trim() !== '') {
        return keyring.getPair(selectedAccount);
      }
      return null;
    } catch (error) {
      console.warn('Failed to get keyring pair:', error);
      return null;
    }
  })();

  const handleSubmit = () => {
    if (!api) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "API not ready"
      });
      return;
    }
    if (!selectedAccount || !issuer || !admin || !freezer) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_fill_required_fields") || "Please fill all required fields."
      });
      return;
    }
    if (!pair) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_no_account_selected") || "No account selected or unable to get keyring pair."
      });
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_account_locked") || "Account is locked."
      });
      return;
    }
    setLoading(true);
    try {
      // Compose the extrinsic
      const tx = api.tx.poscanAssets.setTeam(
        assetId,
        issuer,
        admin,
        freezer
      );
      signAndSend(tx, pair, {}, ({ status }) => {
        if (!status.isInBlock) return;
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: t("dlg_asset.team_set_success") || "Team set successfully!"
        });
        onClose();
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("dlg_asset.set_team_title") || "Set Asset Team"}
      primaryButton={{
        text: t("dlg_asset.set_team_btn") || "Set Team",
        icon: "people",
        onClick: handleSubmit,
        intent: "primary",
        loading,
        disabled: loading,
      }}
    >
      <div className="flex flex-col gap-4">
        <InputGroup
          fill
          placeholder={t("dlg_asset.issuer") || "Issuer address"}
          value={issuer}
          onChange={handleIssuerChange}
          required
        />
        <InputGroup
          fill
          placeholder={t("dlg_asset.admin") || "Admin address"}
          value={admin}
          onChange={handleAdminChange}
          required
        />
        <InputGroup
          fill
          placeholder={t("dlg_asset.freezer") || "Freezer address"}
          value={freezer}
          onChange={handleFreezerChange}
          required
        />
        {/* No inline error or success messages, notifications only */}
      </div>
    </BaseDialog>
  );
} 