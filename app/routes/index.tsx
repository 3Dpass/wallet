import { Card } from "@blueprintjs/core";
import NetworkState from "../components/NetworkState.client";
import Blocks from "../components/Blocks.client";
import { ClientOnly } from "remix-utils";

export default function Index() {
  return (
    <ClientOnly>
      {() => (
        <>
          <Card>
            <NetworkState />
          </Card>
          <Blocks count={6} />
        </>
      )}
    </ClientOnly>
  );
}
