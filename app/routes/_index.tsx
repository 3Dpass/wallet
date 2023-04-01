import NetworkState from "../components/NetworkState.client";
import Blocks from "../components/Blocks.client";
import { ClientOnly } from "remix-utils";
import Wallet from "../components/wallet/Wallet.client";

export default function _index() {
  return (
    <ClientOnly>
      {() => (
        <>
          <Wallet />
          <NetworkState />
          <Blocks />
        </>
      )}
    </ClientOnly>
  );
}
