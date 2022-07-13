import { Button, Card, Intent } from "@blueprintjs/core";
import { useAtomValue } from "jotai";
import { toasterAtom } from "../../atoms";
import { useParams } from "@remix-run/react";

export default function Address() {
  const toaster = useAtomValue(toasterAtom);
  const params = useParams();

  return (
    <Card>
      <Card>{params.address}</Card>
      <Button
        onClick={() => {
          toaster &&
            toaster.show({
              icon: "tick",
              intent: Intent.SUCCESS,
              message: "Clicked!",
            });
        }}
        text="Show toaster"
      />
    </Card>
  );
}
