import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "@remix-run/react";
import { Tab, Tabs } from "@blueprintjs/core";

export default function Governance() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = location.pathname.includes("members") ? "members" : "motions";

  const handleTabChange = (newTabId: string) => {
    navigate(`/governance/${newTabId}`);
  };

  return (
    <div className="grid gap-4">
      <Tabs id="governance-tabs" selectedTabId={currentTab} onChange={handleTabChange} animate={true} large={true}>
        <Tab id="members" title={t("governance.members")} />
        <Tab id="motions" title={t("governance.motions")} />
      </Tabs>
      <Outlet />
    </div>
  );
}
