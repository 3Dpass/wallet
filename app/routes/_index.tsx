import { ClientOnly } from "remix-utils";
import Blocks from "../components/Blocks.client";
import NetworkState from "../components/NetworkState.client";
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
