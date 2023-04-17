import { Button, Classes, Dialog, Intent } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";

import type { SignerOptions } from "@polkadot/api/types";
import { signAndSend } from "../../utils/sign";
import { convertPool, IPool } from "../../utils/pool";
import CustomSelect from "../common/Select";
import useApi from "../../hooks/useApi";
import useToaster from "../../hooks/useToaster";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

type IPoolData = {
  pools: IPool[];
  poolIds: string[];
  poolToJoin: string;
}

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
    const pools = await api.query.miningPool.pools("");
    console.log(pools.toHuman());
    // const pools = JSON.parse("[[[\"qwerty\"], [\"a\", \"b\"]], [[\"asdfg\"], [\"c\",\"d\"]]]");
    const poolsConverted = convertPool(pools.toHuman());
    setData((prev) => ({ ...prev, pools: poolsConverted.pools, poolIds: poolsConverted.poolIds, poolToJoin: poolsConverted.poolIds[0] }));
  }

  function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
    console.dir(api?.tx.miningPool);
    loadPools().then(() => {});
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

  return (
    <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} title="Join a mining pool" onClose={onClose} className="w-[90%] sm:w-[640px]">
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        <CustomSelect<string>
          value={data.poolToJoin}
          onChange={setPool}
          options={data.poolIds}
          mapOptionToLabel={(poolId: string) => poolId}
          mapOptionToValue={(poolId: string) => poolId}
        />
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