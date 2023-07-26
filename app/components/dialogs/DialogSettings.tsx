import { Button, Checkbox, Classes, Dialog, Intent } from "@blueprintjs/core";
import { useAtom } from "jotai";
import { apiEndpointAtom, apiExplorerEndpointAtom, apiAdvancedModeAtom } from "../../atoms";
import { useState } from "react";
import TitledValue from "../common/TitledValue";
import { useTranslation } from "react-i18next";

type IProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogSettings({ isOpen, onClose }: IProps) {
  const { t } = useTranslation();
  const [apiEndpoint, setApiEndpoint] = useAtom(apiEndpointAtom);
  const [apiExplorerEndpoint, setApiExplorerEndpoint] = useAtom(apiExplorerEndpointAtom);
  const [apiAdvancedMode, setApiAdvancedMode] = useAtom(apiAdvancedModeAtom);
  const dataInitial = {
    api_endpoint: apiEndpoint,
    api_explorer_endpoint: apiExplorerEndpoint,
    api_advanced_mode: apiAdvancedMode,
  };
  const [data, setData] = useState(dataInitial);

  function handleOnOpening() {
    setData(dataInitial);
  }

  function handleSaveClick() {
    setApiEndpoint(data.api_endpoint);
    setApiExplorerEndpoint(data.api_explorer_endpoint);
    setApiAdvancedMode(data.api_advanced_mode);
    onClose();
  }

  return (
    <>
      <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} onClose={onClose} className="w-[90%] sm:w-[640px]">
        <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
          <TitledValue
            title={t("dlg_settings.lbl_api_address")}
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
            title={t("dlg_settings.lbl_explorer_graphql")}
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
          <Checkbox
            checked={data.api_advanced_mode}
            large={false}
            className="bp4-control absolute"
            onChange={(e: any) => setData((prev) => ({ ...prev, api_advanced_mode: e.target.checked }))}
          >
            {t("dlg_settings.lbl_advanced_mode")}
          </Checkbox>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={onClose} text={t("commons.lbl_btn_cancel")} />
            <Button intent={Intent.PRIMARY} onClick={handleSaveClick} icon="tick" text={t("dlg_settings.lbl_btn_save")} />
          </div>
        </div>
      </Dialog>
    </>
  );
}
