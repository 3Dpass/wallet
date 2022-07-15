import { useParams } from "@remix-run/react";
import { Card, Spinner, SpinnerSize } from "@blueprintjs/core";
import { ClientOnly } from "remix-utils";
import Transactions from "../../components/Transactions.client";
import { polkadotApiAtom } from "../../atoms";
import { useAtomValue } from "jotai";

export default function Address() {
  const api = useAtomValue(polkadotApiAtom);
  const { address } = useParams();

  if (!api) {
    return <Spinner />;
  }

  return (
    <Card>
      <div className="mb-4 pb-4 border-b border-b-gray-500 text-sm md:text-xl">{address}</div>
      <ClientOnly fallback={<Spinner size={SpinnerSize.SMALL} />}>{() => <Transactions address={address} />}</ClientOnly>
    </Card>
  );
}
