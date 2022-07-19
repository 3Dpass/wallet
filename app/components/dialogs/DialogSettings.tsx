import { Button, Classes, Dialog, Intent } from "@blueprintjs/core";
import { useAtom } from "jotai";
import { apiEndpointAtom } from "../../atoms";
import { useState } from "react";
import TitledValue from "../common/TitledValue";

export default function DialogSettings({ isOpen, onClose }) {
  const [apiEndpoint, setApiEndpoint] = useAtom(apiEndpointAtom);
  const [apiEndpointInput, setApiEndpointInput] = useState("");

  function handleOnOpening() {
    setApiEndpointInput(apiEndpoint);
  }

  function handleSaveClick() {
    setApiEndpoint(apiEndpointInput);
    onClose();
  }

  return (
    <>
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} onClose={onClose} className="w-[90%] sm:w-[640px]">
        <div className={Classes.DIALOG_BODY}>
          <TitledValue
            title="API Endpoint"
            value={
              <input
                className="border border-gray-600 p-1 px-2 mt-2 w-full"
                value={apiEndpointInput}
                onChange={(e) => setApiEndpointInput(e.target.value)}
              />
            }
            fontMono={true}
          />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={onClose} text="Cancel" />
            <Button intent={Intent.PRIMARY} onClick={handleSaveClick} icon="tick" text="Save" />
          </div>
        </div>
      </Dialog>
    </>
  );
}
