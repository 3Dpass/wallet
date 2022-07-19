import NetworkState from "../components/NetworkState.client";
import Blocks from "../components/Blocks.client";
import { ClientOnly } from "remix-utils";
import { useAtomValue } from "jotai";
import { apiAtom } from "../atoms";

export default function Index() {
  const api = useAtomValue(apiAtom);
  return (
    <ClientOnly>
      {() => (
        <>
          {api && <NetworkState api={api} />}
          {api && <Blocks />}
        </>
      )}
    </ClientOnly>
  );
}
