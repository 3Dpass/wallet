import { ApiPromise, WsProvider } from "@polkadot/api";
import type { AccountData } from "@polkadot/types/interfaces";
import type { AccountInfo } from "@polkadot/types/interfaces/system/types";
import { BigInt } from "@polkadot/x-bigint";
import { json } from "@remix-run/node";
import { RPC_CONFIG, RPC_TYPES } from "../api.config";
import { defaultEndpoint } from "../atoms";

async function loadNetworkState() {
  const provider = new WsProvider(defaultEndpoint, false);
  await provider.connect();
  const api = await ApiPromise.create({
    provider,
    rpc: RPC_CONFIG,
    types: RPC_TYPES,
  });

  const totalIssuance = await api.query.balances.totalIssuance();
  const totalIssuanceNumber = BigInt(totalIssuance.toPrimitive() as number);
  const totalSupply = BigInt(1_000_000_000) * BigInt(1_000_000_000_000);

  const budgets = [
    "d1EVSxVDFMMDa79NzV2EvW66PpdD1uLW9aQXjhWZefUfp8Mhf",
    "d1ESJKwsk6zP8tBNJABUnf8mtKcqo1U2UVG7iEZ7uytGbWKAL",
    "d1EjCsWUVnKTG3dysQC2MWDfZKngtiwV2ZLegWRfFMbUR5d6c",
  ];
  const budgetBalances =
    await api.query.system.account.multi<AccountInfo>(budgets);
  let budgetBalancesSum = BigInt(0);
  for (const balance of budgetBalances) {
    const { free, miscFrozen, feeFrozen } = balance.data as AccountData;
    const frozenValue = BigInt(
      Math.max(Number(miscFrozen.toBigInt()), Number(feeFrozen.toBigInt()))
    );
    budgetBalancesSum += free.toBigInt() - frozenValue;
  }

  let circulating = BigInt(0);
  const accounts = await api.query.system.account.entries<AccountInfo>();
  for (const [, account] of accounts) {
    const { free, miscFrozen, feeFrozen } = account.data as AccountData;
    const frozenValue = BigInt(
      Math.max(Number(miscFrozen.toBigInt()), Number(feeFrozen.toBigInt()))
    );
    circulating += free.toBigInt() - frozenValue;
  }

  return {
    totalIssuance: totalIssuanceNumber.toString(),
    circulatingSupply: (circulating - budgetBalancesSum).toString(),
    totalSupply: totalSupply.toString(),
  };
}

// noinspection JSUnusedGlobalSymbols
export async function loader() {
  const networkState = await loadNetworkState();
  return json(networkState, {
    headers: {
      "Cache-Control": "public, s-maxage=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
