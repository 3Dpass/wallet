import { Button, Classes, Dialog, Intent, MenuItem } from "@blueprintjs/core";
import { ItemPredicate, ItemRenderer, Select2 } from "@blueprintjs/select";
import { MouseEventHandler, useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";

import type { SignerOptions } from "@polkadot/api/types";
import { signAndSend } from "../../utils/sign";
import { convertPool, IPool } from "../../utils/pool";
import useToaster from "../../hooks/useToaster";
import { useApi } from "../Api";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

type IPoolData = {
  pools: IPool[];
  poolIds: string[];
  poolToJoin: string;
};

export default function DialogJoinPool({ isOpen, onClose, pair }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dataInitial: IPoolData = {
    pools: [],
    poolIds: [],
    poolToJoin: "",
  };
  const [data, setData] = useState(dataInitial);

  async function loadPools() {
    if (!api) {
      return;
    }
    const pools = Array.from(await api.query.miningPool.pools.entries());
    const poolsConverted = convertPool(pools);
    setData((prev) => ({ ...prev, pools: poolsConverted.pools, poolIds: poolsConverted.poolIds, poolToJoin: poolsConverted.poolIds[0] }));
  }

  function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
    void loadPools();
  }

  useEffect(() => {
    setCanSubmit(api !== undefined);
  }, [api, {}]);

  async function handleSubmitClick() {
    if (!api) {
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "Account is locked",
      });
      return;
    }
    setIsLoading(true);
    try {
      const tx = api.tx.miningPool.addMemberSelf(data.poolToJoin);
      const options: Partial<SignerOptions> = {};
      await signAndSend(tx, pair, options);
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: "You have joined the mining pool",
      });
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
    } finally {
      setIsLoading(false);
      onClose();
    }
  }

  function setPool(poolId: string) {
    setData((prev) => ({ ...prev, poolToJoin: poolId }));
  }

  const filterPool: ItemPredicate<string> = (query, poolId, _index, exactMatch) => {
    const normalizedId = poolId.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    if (exactMatch) {
      return normalizedId === normalizedQuery;
    } else {
      return normalizedId.indexOf(normalizedQuery) >= 0;
    }
  };

  const renderPoolId: ItemRenderer<string> = (poolId, { handleClick, handleFocus, modifiers, query }) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        active={modifiers.active}
        disabled={modifiers.disabled}
        key={poolId}
        label={poolId}
        onClick={handleClick as MouseEventHandler}
        onFocus={handleFocus}
        roleStructure="listoption"
        text=""
      />
    );
  };

  return (
    <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} title="Join a mining pool" onClose={onClose} className="w-[90%] sm:w-[640px]">
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        <Select2
          items={data.poolIds}
          itemPredicate={filterPool}
          itemRenderer={renderPoolId}
          noResults={<MenuItem disabled={true} text="No results." roleStructure="listoption" />}
          onItemSelect={setPool}
          popoverProps={{ matchTargetWidth: true }}
          fill={true}
        >
          <Button
            text={data.poolToJoin}
            rightIcon="double-caret-vertical"
            placeholder="Select a pool"
            className={`${Classes.CONTEXT_MENU} ${Classes.FILL}`}
          />
        </Select2>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose} text="Cancel" disabled={isLoading} />
          <Button
            intent={Intent.PRIMARY}
            disabled={isLoading || !canSubmit}
            onClick={handleSubmitClick}
            icon="add"
            loading={isLoading}
            text="Join the pool"
          />
        </div>
      </div>
    </Dialog>
  );
}
