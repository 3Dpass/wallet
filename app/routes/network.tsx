import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { defaultEndpoint } from "../atoms";
import { getApi, getProvider } from "../api";

async function loadNetworkState() {
  const provider = getProvider(defaultEndpoint);
  const api = await getApi(provider);
  const totalIssuance = await api.query.balances.totalIssuance();
  return {
    totalIssuance: totalIssuance.toString(),
  };
}

export async function loader({ params }: LoaderArgs) {
  return json(await loadNetworkState());
}
