import { ApiPromise, WsProvider } from "@polkadot/api";
import { BigInt as PolkaBigInt } from "@polkadot/x-bigint";
import { RPC_CONFIG, RPC_TYPES } from "../api.config";
import { defaultEndpoint } from "../atoms";
import { P3D_DECIMALS_FACTOR } from "../utils/converter";

async function getTotalIssuance() {
  const provider = new WsProvider(defaultEndpoint, false);
  await provider.connect();
  const api = await ApiPromise.create({
    provider,
    rpc: RPC_CONFIG,
    types: RPC_TYPES,
  });

  const totalIssuance = await api.query.balances.totalIssuance();
  const totalIssuanceNumber = PolkaBigInt(
    totalIssuance.toPrimitive() as number
  );

  return (totalIssuanceNumber / PolkaBigInt(P3D_DECIMALS_FACTOR)).toString();
}

export async function loader() {
  const totalIssuance = await getTotalIssuance();
  return new Response(totalIssuance, {
    headers: {
      "Cache-Control": "public, s-maxage=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
