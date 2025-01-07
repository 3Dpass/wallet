import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "@remix-run/react";
import { Tab, Tabs, Icon } from "@blueprintjs/core";
import { Container } from "../components/common/Container";
import { AddressSelect } from "../components/governance/AddressSelect";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "app/atoms";
import { useAccounts } from "app/components/Api";

export default function Governance() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedAccount, setSelectedAccount] = useAtom(lastSelectedAccountAtom);
  const accountObjects = useAccounts();
  const accounts = accountObjects.map((account) => account.address);

  const currentTab = location.pathname.includes("members") ? "members" : location.pathname.includes("bounties") ? "bounties" : "motions";

  const handleTabChange = (newTabId: string) => {
    navigate(`/governance/${newTabId}`);
  };

  return (
    <Container>
      <div className="grid gap-6">
        <div className="flex justify-between items-center">
          <Tabs id="governance-tabs" selectedTabId={currentTab} onChange={handleTabChange} animate={true} large={true}>
            <Tab id="motions" title={t("governance.motions")} icon={<Icon icon="take-action" className="mr-2" />} />
            <Tab id="bounties" title={t("governance.bounties")} icon={<Icon icon="dollar" className="mr-2" />} />
            <Tab id="members" title={t("governance.members")} icon={<Icon icon="people" className="mr-2" />} />
          </Tabs>
          <AddressSelect
            onAddressChange={setSelectedAccount}
            selectedAddress={selectedAccount}
            addresses={accounts}
            isLoading={accounts.length === 0}
          />
        </div>
        <Outlet />
      </div>
    </Container>
  );
}
