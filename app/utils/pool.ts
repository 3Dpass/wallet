import type { StorageKey } from "@polkadot/types";
import type { AnyTuple, Codec } from "@polkadot/types/types";

export type IPool = {
  poolId: string;
  poolMembers: string[];
};

export type IPoolBox = {
  pools: IPool[];
  poolIds: string[];
};

export const convertPool = (
  poolsSource: [StorageKey<AnyTuple>, Codec][]
): IPoolBox => {
  const pools: IPool[] = [];
  const poolIds: string[] = [];
  let currentPoolId: string;
  poolsSource.forEach((p: [StorageKey<AnyTuple>, Codec]) => {
    currentPoolId = (p[0].toHuman() as string[])[0];
    if (currentPoolId && p[1]) {
      pools.push({
        poolId: currentPoolId,
        poolMembers: p[1].toHuman() as string[],
      });
      poolIds.push(currentPoolId);
    }
  });
  return {
    pools: pools,
    poolIds: poolIds,
  };
};

export const poolsWithMember = (
  poolBox: IPoolBox,
  accountId: string
): IPoolBox => {
  const poolsNew: IPool[] = [];
  const poolIdsNew: string[] = [];
  poolBox.pools.forEach((p: IPool) => {
    if (p.poolMembers.includes(accountId)) {
      poolsNew.push(p);
      poolIdsNew.push(p.poolId);
    }
  });
  return {
    pools: poolsNew,
    poolIds: poolIdsNew,
  };
};
