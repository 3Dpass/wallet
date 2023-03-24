import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { defaultEndpoint } from "../atoms";
import { getApi, getProvider } from "../api";

async function loadNetworkState() {
  const provider = getProvider(defaultEndpoint);
  const api = await getApi(provider);
  const totalIssuance = await api.query.balances.totalIssuance();
  const totalIssuanceNumber = totalIssuance.toPrimitive() as number;
  const addresses = [
    "d1CNDotJXNPvnSA5EQXpSbkUyXBVmaggkARY7kcgXim4BqeBJ",
    "d1GZ8GxP3KzKJGRYmp9HMwxurnSKx3ACcqeZqLY5kpbLEyjzE",
    "d1GA9xWx3WgpQHp8LHCXHbYoZdvjY3NHhU6gR2fsdVCiC4TdF",
    "d1ESJKwsk6zP8tBNJABUnf8mtKcqo1U2UVG7iEZ7uytGbWKAL",
    "d1EVSxVDFMMDa79NzV2EvW66PpdD1uLW9aQXjhWZefUfp8Mhf",
  ];
  const balancePromises = addresses.map(async (address) => {
    const accountInfo = await api.query.system.account(address);
    const balance = Number(accountInfo.data.free.toString());
    return balance;
  });

  const balances = await Promise.all(balancePromises);
  const balanceSum = balances.reduce((acc, val) => acc + val, 0);
  const accounts = await api.query.system.account.entries();
  const totalMiscFrozen = accounts.reduce(
    (accumulator, [accountId, accountData]) => accumulator + parseFloat(accountData.data.miscFrozen.toHuman().replaceAll(",", "")),
    0
  );
  const locked = totalMiscFrozen;

  const circulatingSupply = totalIssuanceNumber - balanceSum - locked;
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
