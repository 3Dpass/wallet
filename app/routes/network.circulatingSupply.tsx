import { ApiPromise, WsProvider } from "@polkadot/api";
import type { AccountData } from "@polkadot/types/interfaces";
import type { AccountInfo } from "@polkadot/types/interfaces/system/types";
import { BigInt as PolkaBigInt } from "@polkadot/x-bigint";
import { RPC_CONFIG, RPC_TYPES } from "../api.config";
import { defaultEndpoint } from "../atoms";

async function getCirculatingSupply() {
  const provider = new WsProvider(defaultEndpoint, false);
  await provider.connect();
  const api = await ApiPromise.create({
    provider,
    rpc: RPC_CONFIG,
    types: RPC_TYPES,
  });

  const budgets = [
    "d1EVSxVDFMMDa79NzV2EvW66PpdD1uLW9aQXjhWZefUfp8Mhf",
    "d1ESJKwsk6zP8tBNJABUnf8mtKcqo1U2UVG7iEZ7uytGbWKAL",
    "d1EjCsWUVnKTG3dysQC2MWDfZKngtiwV2ZLegWRfFMbUR5d6c",
  ];

  const [budgetBalances, accounts] = await Promise.all([
    api.query.system.account.multi<AccountInfo>(budgets),
    api.query.system.account.entries<AccountInfo>(),
  ]);

  let budgetBalancesSum = PolkaBigInt(0);
  for (const balance of budgetBalances) {
    const { free, miscFrozen, feeFrozen } = balance.data as AccountData;
    const frozenValue = PolkaBigInt(
      Math.max(Number(miscFrozen.toBigInt()), Number(feeFrozen.toBigInt()))
    );
    budgetBalancesSum += free.toBigInt() - frozenValue;
  }

  let circulating = PolkaBigInt(0);
  for (const [, account] of accounts) {
    const { free, miscFrozen, feeFrozen } = account.data as AccountData;
    const frozenValue = PolkaBigInt(
      Math.max(Number(miscFrozen.toBigInt()), Number(feeFrozen.toBigInt()))
    );
    circulating += free.toBigInt() - frozenValue;
  }

  return ((circulating - budgetBalancesSum) / PolkaBigInt(10 ** 12)).toString();
}

export async function loader() {
  const circulatingSupply = await getCirculatingSupply();
  return new Response(circulatingSupply, {
    headers: {
      "Cache-Control": "public, s-maxage=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
