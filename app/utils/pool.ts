import type { StorageKey } from "@polkadot/types";
import type { AnyTuple, Codec } from "@polkadot/types/types";

export type IPool = {
  poolId: string;
  poolMembers: string[];
};

type IPoolBox = {
  pools: IPool[];
  poolIds: string[];
};

export const convertPool = (
  poolsSource: [StorageKey<AnyTuple>, Codec][]
): IPoolBox => {
  const pools: IPool[] = [];
  const poolIds: string[] = [];
  let currentPoolId: string;
  for (const p of poolsSource) {
    const poolIdArray = p[0]?.toHuman() as string[];
    currentPoolId = poolIdArray?.[0];
    if (currentPoolId && p[1]) {
      const poolMembers = p[1].toHuman() as string[];
      pools.push({
        poolId: currentPoolId,
        poolMembers: poolMembers || [],
      });
      poolIds.push(currentPoolId);
    }
  }
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
  for (const p of poolBox.pools) {
    if (p.poolMembers.includes(accountId)) {
      poolsNew.push(p);
      poolIdsNew.push(p.poolId);
    }
  }
  return {
    pools: poolsNew,
    poolIds: poolIdsNew,
  };
};
