import { Button, Classes, Dialog, Intent, MenuItem } from "@blueprintjs/core";
import type { ItemPredicate, ItemRenderer } from "@blueprintjs/select";
import { Select2 } from "@blueprintjs/select";
import type { MouseEventHandler } from "react";
import { useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";
import { signAndSend } from "../../utils/sign";
import type { IPool } from "../../utils/pool";
import { convertPool } from "../../utils/pool";
import useToaster from "../../hooks/useToaster";
import { useApi } from "../Api";
import type { ApiPromise } from "@polkadot/api";
import { useTranslation } from "react-i18next";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

type IPoolData = {
  pools: IPool[];
  poolToJoin: string;
};

export default function DialogJoinPool({ isOpen, onClose, pair }: IProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dataInitial: IPoolData = {
    pools: [],
    poolToJoin: "",
  };
  const [data, setData] = useState(dataInitial);

  async function loadPools(api: ApiPromise) {
    const pools = Array.from(await api.query.miningPool.pools.entries());
    const poolsConverted = convertPool(pools);
    setData((prev) => ({ ...prev, pools: poolsConverted.pools, poolToJoin: poolsConverted.pools[0].poolId }));
  }

  function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
    void loadPools(api!);
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
      const tx = api.tx.miningPool.addMemberSelf(data.poolToJoin);
      await signAndSend(tx, pair, {}, (status) => {
        if (status.isInBlock) {
          toaster.show({
            icon: "endorsed",
            intent: Intent.SUCCESS,
            message: t("messages.lbl_joined_pool"),
          });
          setIsLoading(false);
          onClose();
        }
      });
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
      setIsLoading(false);
    }
  }

  function setPool(pool: IPool) {
    setData((prev) => ({ ...prev, poolToJoin: pool.poolId }));
  }

  const filterPool: ItemPredicate<IPool> = (query, pool, _index, exactMatch) => {
    const normalizedId = pool.poolId.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    if (exactMatch) {
      return normalizedId === normalizedQuery;
    }
    return normalizedId.indexOf(normalizedQuery) >= 0;
  };

  const renderPool: ItemRenderer<IPool> = (pool: IPool, { handleClick, handleFocus, modifiers }) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        className="font-mono"
        active={modifiers.active}
        disabled={modifiers.disabled}
        key={pool.poolId}
        text={pool.poolId}
        label={pool.poolMembers.length.toString()}
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
      title={t("dlg_join_pool.lbl_title")}
      onClose={onClose}
      className="w-[90%] sm:w-[640px]"
    >
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        <Select2
          items={data.pools}
          itemPredicate={filterPool}
          itemRenderer={renderPool}
          menuProps={{ className: "max-h-[300px] overflow-auto" }}
          noResults={<MenuItem disabled text={t("dlg_join_pool.lbl_no_results")} roleStructure="listoption" />}
          onItemSelect={setPool}
          popoverProps={{ matchTargetWidth: true }}
          fill
        >
          <Button
            text={data.poolToJoin}
            rightIcon="double-caret-vertical"
            placeholder={t("dlg_join_pool.lbl_btn_select_pool")}
            className={`${Classes.CONTEXT_MENU} ${Classes.FILL} font-mono`}
          />
        </Select2>
      </div>
      {data.poolToJoin && <div className="font-mono px-4 text-gray-400">$ pass3d-pool run --pool-id {data.poolToJoin} ...</div>}
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose} text={t("commons.lbl_btn_cancel")} disabled={isLoading} />
          <Button
            intent={Intent.PRIMARY}
            disabled={isLoading || !canSubmit}
            onClick={handleSubmitClick}
            icon="add"
            loading={isLoading}
            text={t("dlg_join_pool.lbl_btn_join_pool")}
          />
        </div>
      </div>
    </Dialog>
  );
}
