import { ClientOnly } from "remix-utils";
import BountiesClient from "./governance.bounties.client";

export default function Bounties() {
  return <ClientOnly fallback={null}>{() => <BountiesClient />}</ClientOnly>;
}
