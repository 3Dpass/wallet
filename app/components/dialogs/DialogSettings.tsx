import {Button, Checkbox, Intent} from "@blueprintjs/core";
import {useAtom} from "jotai";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {apiAdvancedModeAtom, apiEndpointAtom, defaultEndpoint} from "../../atoms";
import TitledValue from "../common/TitledValue";
import BaseDialog from "./BaseDialog";

type IProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogSettings({isOpen, onClose}: IProps) {
  const {t} = useTranslation();
  const [apiEndpoint, setApiEndpoint] = useAtom(apiEndpointAtom);
  const [apiAdvancedMode, setApiAdvancedMode] = useAtom(apiAdvancedModeAtom);
  const dataInitial = {
    api_endpoint: apiEndpoint,
    api_advanced_mode: apiAdvancedMode,
  };
  const [data, setData] = useState(dataInitial);

  function handleOnOpening() {
    setData(dataInitial);
  }

  function handleSaveClick() {
    setApiEndpoint(data.api_endpoint);
    setApiAdvancedMode(data.api_advanced_mode);
    onClose();
  }

  return (
    <BaseDialog
      isOpen={isOpen}
      onOpening={handleOnOpening}
      onClose={onClose}
      primaryButton={{
        intent: Intent.PRIMARY,
        onClick: handleSaveClick,
        icon: "tick",
        text: t("dlg_settings.lbl_btn_save"),
      }}
      footerContent={
        <Checkbox
          checked={data.api_advanced_mode}
          className="bp4-control absolute"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setData((prev) => ({
              ...prev,
              api_advanced_mode: e.target.checked,
            }))
          }
        >
          {t("dlg_settings.lbl_advanced_mode")}
        </Checkbox>
      }
    >
      <TitledValue
        title={t("dlg_settings.lbl_api_address")}
        value={
          <div style={{display: "flex", alignItems: "stretch", gap: 8, whiteSpace: "nowrap"}}>
            <input
              className="border border-gray-600 p-1 px-2 mt-2 w-full"
              value={data.api_endpoint}
              onChange={(e) =>
                setData((prev) => ({...prev, api_endpoint: e.target.value}))
              }
            />
            <Button
              icon="reset"
              style={{marginTop: 8, minWidth: 130, fontWeight: 500}}
              onClick={() => {
                setData((prev) => ({...prev, api_endpoint: defaultEndpoint}));
                setApiEndpoint(defaultEndpoint);
              }}
              size="small"
              title="Reset RPC endpoint to default"
              disabled={data.api_endpoint === defaultEndpoint}
            >
              Reset
            </Button>
          </div>
        }
        fontMono
      />
    </BaseDialog>
  );
}
