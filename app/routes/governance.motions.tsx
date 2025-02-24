import { Card, Elevation, Spinner } from "@blueprintjs/core";
import { ClientOnly } from "remix-utils";

export default function GovernanceMotionsWrapper() {
  return (
    <ClientOnly
      fallback={
        <Card elevation={Elevation.ONE} className="p-4">
          <Spinner />
        </Card>
      }
    >
      {() => {
        const GovernanceMotions =
          require("./governance.motions.client").default;
        return <GovernanceMotions />;
      }}
    </ClientOnly>
  );
}
