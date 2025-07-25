import { Button, Intent, MenuItem } from "@blueprintjs/core";
import {
  type ItemPredicate,
  type ItemRenderer,
  Select2,
} from "@blueprintjs/select";
import type { SignerOptions } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import { type MouseEventHandler, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import { convertPool, type IPool, poolsWithMember } from "../../utils/pool";
import { signAndSend } from "../../utils/sign";
import { useApi } from "../Api";
import BaseDialog from "./BaseDialog";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

type IPoolData = {
  pools: IPool[];
  poolIds: string[];
  poolToLeave: string;
};

export default function DialogLeavePool({ isOpen, onClose, pair }: IProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dataInitial: IPoolData = {
    pools: [],
    poolIds: [],
    poolToLeave: "",
  };
  const [data, setData] = useState(dataInitial);

  async function loadPools() {
    if (!api) {
      return;
    }
    const pools = Array.from(await api.query.miningPool.pools.entries());
    const poolsFiltered = poolsWithMember(convertPool(pools), pair.address);
    setData((prev) => ({
      ...prev,
      pools: poolsFiltered.pools,
      poolIds: poolsFiltered.poolIds,
      poolToLeave: poolsFiltered.poolIds[0],
    }));
  }

  function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
    void loadPools();
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
      const tx = api.tx.miningPool.removeMemberSelf(data.poolToLeave);
      const options: Partial<SignerOptions> = {};
      await signAndSend(tx, pair, options);
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: t("messages.lbl_left_mining_pool"),
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

  function setPool(poolId: string) {
    setData((prev) => ({ ...prev, poolToLeave: poolId }));
  }

  const filterPool: ItemPredicate<string> = (
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

  const renderPoolId: ItemRenderer<string> = (
    poolId,
    {
      handleClick: _handleClick,
      handleFocus: _handleFocus,
      modifiers,
      query: _query,
    }
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
        onClick={_handleClick as MouseEventHandler}
        onFocus={_handleFocus}
        roleStructure="listoption"
      />
    );
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      onOpening={handleOnOpening}
      title={t("dlg_leave_pool.lbl_title")}
      onClose={onClose}
      primaryButton={{
        intent: Intent.PRIMARY,
        disabled: isLoading || !canSubmit,
        onClick: handleSubmitClick,
        icon: "log-out",
        loading: isLoading,
        text: t("dlg_leave_pool.lbl_btn_leave_pool"),
      }}
    >
      <Select2
        items={data.poolIds}
        itemPredicate={filterPool}
        itemRenderer={renderPoolId}
        noResults={
          <MenuItem
            disabled
            text={t("dlg_leave_pool.lbl_no_results")}
            roleStructure="listoption"
          />
        }
        onItemSelect={setPool}
        popoverProps={{ matchTargetWidth: true }}
        fill
      >
        <Button
          text={data.poolToLeave}
          rightIcon="double-caret-vertical"
          className="bp4-context-menu bp4-fill font-mono text-lg"
        />
      </Select2>
    </BaseDialog>
  );
}
