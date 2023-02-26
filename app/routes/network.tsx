import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { defaultEndpoint } from "../atoms";
import { getApi, getProvider } from "../api";

async function loadNetworkState() {
  const provider = getProvider(defaultEndpoint);
  const api = await getApi(provider);
  const totalIssuance = await api.query.balances.totalIssuance();
  const totalIssuanceNumber = totalIssuance.toPrimitive() as number;
  const budget = 33666666000000000000 * 3 + 110000000000000000000 + 60000000000000000000;
  const circulatingSupply = totalIssuanceNumber - budget;
  const totalSupply = 1_000_000_000 * 1_000_000_000_000;

  return {
    totalIssuance: numberToString(totalIssuanceNumber),
    circulatingSupply: numberToString(circulatingSupply),
    totalSupply: numberToString(totalSupply),
  };
}

export async function loader({ params }: LoaderArgs) {
  const networkState = await loadNetworkState();
  return json(networkState, {
    headers: {
      "Cache-Control": "public, s-maxage=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

const numberToString = (number: number) => {
  return number.toLocaleString("fullwide", { useGrouping: false });
};
