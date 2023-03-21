import { Button, Classes, Dialog, Intent } from "@blueprintjs/core";
import { useAtom } from "jotai";
import { apiEndpointAtom, apiExplorerEndpointAtom } from "../../atoms";
import { useState } from "react";
import TitledValue from "../common/TitledValue";

export default function DialogSettings({ isOpen, onClose }) {
  const [apiEndpoint, setApiEndpoint] = useAtom(apiEndpointAtom);
  const [apiExplorerEndpoint, setApiExplorerEndpoint] = useAtom(apiExplorerEndpointAtom);
  const dataInitial = {
    api_endpoint: apiEndpoint,
    api_explorer_endpoint: apiExplorerEndpoint,
  };
  const [data, setData] = useState(dataInitial);

  function handleOnOpening() {
    setData(dataInitial);
  }

  function handleSaveClick() {
    setApiEndpoint(data.api_endpoint);
    setApiExplorerEndpoint(data.api_explorer_endpoint);
    onClose();
  }

  return (
    <>
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} onClose={onClose} className="w-[90%] sm:w-[640px]">
        <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
          <TitledValue
            title="RPC API"
            value={
              <input
                className="border border-gray-600 p-1 px-2 mt-2 w-full"
                value={data.api_endpoint}
                onChange={(e) => setData((prev) => ({ ...prev, api_endpoint: e.target.value }))}
              />
            }
            fontMono={true}
          />
          <TitledValue
            title="Explorer GraphQL"
            value={
              <input
                className="border border-gray-600 p-1 px-2 mt-2 w-full"
                value={data.api_explorer_endpoint}
                onChange={(e) => setData((prev) => ({ ...prev, api_explorer_endpoint: e.target.value }))}
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
