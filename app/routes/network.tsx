import { json } from "@remix-run/node";
import { defaultEndpoint } from "../atoms";
import type { AccountInfo } from "@polkadot/types/interfaces/system/types";
import type { AccountData } from "@polkadot/types/interfaces";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { RPC_CONFIG, RPC_TYPES } from "../api.config";

async function loadNetworkState() {
  const provider = new WsProvider(defaultEndpoint, false);
  await provider.connect();
  const api = await ApiPromise.create({ provider, rpc: RPC_CONFIG, types: RPC_TYPES });

  const totalIssuance = await api.query.balances.totalIssuance();
  const totalIssuanceNumber = BigInt(totalIssuance.toPrimitive() as number);
  const totalSupply = BigInt(1_000_000_000) * BigInt(1_000_000_000_000);

  const staffAndInvestors = [
    "d1CNDotJXNPvnSA5EQXpSbkUyXBVmaggkARY7kcgXim4BqeBJ",
    "d1GZ8GxP3KzKJGRYmp9HMwxurnSKx3ACcqeZqLY5kpbLEyjzE",
    "d1GA9xWx3WgpQHp8LHCXHbYoZdvjY3NHhU6gR2fsdVCiC4TdF",
    "d1ESJKwsk6zP8tBNJABUnf8mtKcqo1U2UVG7iEZ7uytGbWKAL",
    "d1EVSxVDFMMDa79NzV2EvW66PpdD1uLW9aQXjhWZefUfp8Mhf",
  ];
  // @ts-ignore
  const balances = await api.query.system.account.multi<AccountInfo>(staffAndInvestors);
  const balancesNumber = balances.map((balance) => {
    const data = balance.data as AccountData;
    return data.free.toBigInt();
  });
  const staffAndInvestorsSum = balancesNumber.reduce((a, b) => a + b, BigInt(0));

  let frozen = BigInt(0);
  let circulating = BigInt(0);
  const accounts = await api.query.system.account.entries<AccountInfo>();
  accounts.map(([_, account]) => {
    const data = account.data as AccountData;
    frozen += data.miscFrozen.toBigInt();
    circulating += data.free.toBigInt();
    return null;
  });

  return {
    totalIssuance: totalIssuanceNumber.toString(),
    circulatingSupply: (circulating - frozen - staffAndInvestorsSum).toString(),
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
