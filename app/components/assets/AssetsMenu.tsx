import { Icon, Tab, Tabs } from "@blueprintjs/core";
import { useLocation, useNavigate } from "@remix-run/react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export default function AssetsMenu() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  let currentTab = "objects";
  if (location.pathname.includes("/assets/tokens")) currentTab = "tokens";
  else if (location.pathname.includes("/assets/objects"))
    currentTab = "objects";

  const handleTabChange = useCallback(
    (newTabId: string) => {
      navigate(`/assets/${newTabId}`);
    },
    [navigate]
  );

  return (
    <Tabs
      id="assets-tabs"
      selectedTabId={currentTab}
      onChange={handleTabChange}
      animate={true}
      large={true}
      className=""
    >
      <Tab
        id="objects"
        title={
          <span className="flex items-center">
            <Icon icon="cube" className="mr-2" />
            {t("assets.objects")}
          </span>
        }
      />
      <Tab
        id="tokens"
        title={
          <span className="flex items-center">
            <Icon icon="dollar" className="mr-2" />
            {t("assets.tokens")}
          </span>
        }
      />
    </Tabs>
  );
}
