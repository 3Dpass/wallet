import { Button, Classes, Dialog, Intent, MenuItem } from "@blueprintjs/core";
import {
  type ItemPredicate,
  type ItemRenderer,
  Select2,
} from "@blueprintjs/select";
import type { KeyringPair } from "@polkadot/keyring/types";
import { type MouseEventHandler, useEffect, useState } from "react";

import type { SignerOptions } from "@polkadot/api/types";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import { signAndSend } from "../../utils/sign";
import { useApi } from "../Api";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

type IMinerData = {
  miners: string[];
  memberToRemove: string;
};

export default function DialogRemoveMiner({ isOpen, onClose, pair }: IProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dataInitial: IMinerData = {
    miners: [],
    memberToRemove: "",
  };

  const [data, setData] = useState(dataInitial);

  async function loadMembers() {
    if (!api) {
      return;
    }
    const members = await api.query.miningPool.pools(pair.address);
    const membersConverted = members.toHuman() as string[];
    setData((prev) => ({
      ...prev,
      miners: membersConverted,
      memberToRemove: membersConverted[0],
    }));
  }

  function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
    void loadMembers();
  }

  useEffect(() => {
    setCanSubmit(api !== undefined);
  }, [api]);

  async function handleSubmitClick() {
    if (!api) {
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_account_locked"),
      });
      return;
    }
    setIsLoading(true);
    try {
      const tx = api.tx.miningPool.removeMember(data.memberToRemove);
      const options: Partial<SignerOptions> = {};
      await signAndSend(tx, pair, options);
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: t("messages.lbl_removed_from_mining_pool"),
      });
    } catch (e: unknown) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
      onClose();
    }
  }

  function setMember(memberId: string) {
    setData((prev) => ({ ...prev, memberToRemove: memberId }));
  }

  const filterMember: ItemPredicate<string> = (
    query,
    poolId,
    _index,
    exactMatch
  ) => {
    const normalizedId = poolId.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    if (exactMatch) {
      return normalizedId === normalizedQuery;
    }
    return normalizedId.indexOf(normalizedQuery) >= 0;
  };

  const renderMemberId: ItemRenderer<string> = (
    poolId,
    { handleClick, handleFocus, modifiers, query }
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        className="font-mono text-lg"
        active={modifiers.active}
        disabled={modifiers.disabled}
        key={poolId}
        text={poolId}
        onClick={handleClick as MouseEventHandler}
        onFocus={handleFocus}
        roleStructure="listoption"
      />
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      usePortal
      onOpening={handleOnOpening}
      title={t("dlg_remove_miner.lbl_title")}
      onClose={onClose}
      className="w-[90%] sm:w-[640px]"
    >
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        <Select2
          items={data.miners}
          itemPredicate={filterMember}
          itemRenderer={renderMemberId}
          noResults={
            <MenuItem
              disabled
              text={t("dlg_remove_miner.lbl_no_results")}
              roleStructure="listoption"
            />
          }
          onItemSelect={setMember}
          popoverProps={{ matchTargetWidth: true }}
          fill
        >
          <Button
            text={data.memberToRemove}
            rightIcon="double-caret-vertical"
            className={`${Classes.CONTEXT_MENU} ${Classes.FILL} font-mono text-lg`}
          />
        </Select2>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            onClick={onClose}
            text={t("commons.lbl_btn_cancel")}
            disabled={isLoading}
          />
          <Button
            intent={Intent.PRIMARY}
            disabled={isLoading || !canSubmit}
            onClick={handleSubmitClick}
            icon="remove"
            loading={isLoading}
            text={t("dlg_remove_miner.lbl_btn_remove_miner")}
          />
        </div>
      </div>
    </Dialog>
  );
}
