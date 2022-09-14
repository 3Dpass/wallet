import NetworkState from "../components/NetworkState.client";
import Blocks from "../components/Blocks.client";
import { ClientOnly } from "remix-utils";
import { useAtomValue } from "jotai";
import { apiAtom } from "../atoms";
import Wallet from "../components/wallet/Wallet.client";

export default function Index() {
  const api = useAtomValue(apiAtom);

  return (
    <ClientOnly>
      {() => (
        <>
          <Wallet />
          <NetworkState api={api} />
          <Blocks />
        </>
      )}
    </ClientOnly>
  );
}
