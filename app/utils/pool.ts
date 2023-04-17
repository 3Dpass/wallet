import { AnyJson } from "@polkadot/types/types";

export type IPool = {
  poolId: string[];
  poolMembers: string[];
};

export type IPoolBox = {
  pools: IPool[];
  poolIds: string[];
}

export const convertPool = (poolsSource: AnyJson): IPoolBox => {
  let pools: IPool[] = [];
  let poolIds: string[] = [];
  (poolsSource as string[][][]).forEach(function (p: string[][]) {
    pools.push({ poolId: p[0], poolMembers: p[1] });
    if (p[0] && p[0][0]) {
      poolIds.push(p[0][0]);
    }
  })
  return {
    pools: pools,
    poolIds: poolIds,
  }
};
