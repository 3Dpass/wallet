import { Card, Divider, Icon, Spinner, SpinnerSize } from "@blueprintjs/core";
import { useParams } from "@remix-run/react";
import Transactions from "../../components/Transactions.client";
import { ClientOnly } from "remix-utils";

export default function Address() {
  const { address } = useParams();

  return (
    <Card>
      <div>
        <Icon icon="id-number" className="mr-1" />
        {address}
      </div>
      <Divider className="my-4" />
      <ClientOnly fallback={<Spinner size={SpinnerSize.SMALL} />}>{() => <Transactions address={address} />}</ClientOnly>
    </Card>
  );
}
