import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { defaultEndpoint } from "../atoms";
import { getApi, getProvider } from "../api";

async function loadNetworkState() {
  const provider = getProvider(defaultEndpoint);
  const api = await getApi(provider);
  const totalIssuance = await api.query.balances.totalIssuance();
  const budget = 33666666000000000000 * 3 + 110000000000000000000 + 60000000000000000000;
  const circulatingSupply = totalIssuance.toPrimitive() - budget;
  return {
    totalIssuance: totalIssuance.toString(),
    circulatingSupply: circulatingSupply.toString(),
  };
}

export async function loader({ params }: LoaderArgs) {
  const networkState = await loadNetworkState();
  return json(networkState, {
    headers: {
      "Cache-Control": "public, s-maxage=60",
    },
  });
}
