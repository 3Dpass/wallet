import { useParams } from "@remix-run/react";
import { Card, Spinner, SpinnerSize } from "@blueprintjs/core";
import { ClientOnly } from "remix-utils";
import Transactions from "../../components/Transactions.client";
import { apiAtom } from "../../atoms";
import { useAtomValue } from "jotai";
import { lazy } from "react";

const TitledValue = lazy(() => import("../../components/common/TitledValue"));
const Divider = lazy(() => import("@blueprintjs/core").then((module) => ({ default: module.Divider })));

export default function Address() {
  const api = useAtomValue(apiAtom);
  const { address } = useParams();

  if (!api) {
    return <Spinner />;
  }

  return (
    <Card>
      <ClientOnly fallback={<Spinner size={SpinnerSize.SMALL} />}>
        {() => (
          <>
            <TitledValue title="Address" value={address} fontMono={true} />
            <Divider className="my-5" />
            <Transactions address={address} />
          </>
        )}
      </ClientOnly>
    </Card>
  );
}
