import { json } from "@remix-run/node";
import { defaultEndpoint } from "../atoms";
import { getApi, getProvider } from "../api";
import type { AccountInfo } from "@polkadot/types/interfaces/system/types";
import type { AccountData } from "@polkadot/types/interfaces";

async function loadNetworkState() {
  const provider = getProvider(defaultEndpoint);
  const api = await getApi(provider);

  const totalIssuance = await api.query.balances.totalIssuance();
  const totalIssuanceNumber = BigInt(totalIssuance.toPrimitive() as number);
  const totalSupply = BigInt(1_000_000_000 * 1_000_000_000_000);

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
    circulatingSupply: (circulating - frozen).toString(),
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
