import { useTranslation } from "react-i18next";
import { Classes, HTMLSelect, Spinner } from "@blueprintjs/core";
import { useAccounts } from "app/components/Api";
import { AccountName } from "app/components/common/AccountName";
import { useEffect } from "react";

interface AccountSelectorProps {
  onAccountChange: (address: string | null) => void;
  selectedAddress?: string | null;
}

export function AccountSelector({ onAccountChange, selectedAddress }: AccountSelectorProps) {
  const { t } = useTranslation();
  const accounts = useAccounts();

  useEffect(() => {
    // If we have accounts but no selection, default to first account
    if (accounts.length > 0 && !selectedAddress) {
      onAccountChange(accounts[0].address);
    }
  }, [accounts, selectedAddress, onAccountChange]);

  const handleAccountChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const address = event.target.value || null;
    onAccountChange(address);
  };

  if (accounts.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="font-medium whitespace-nowrap">{t("governance.active_account")}:</div>
        <Spinner size={16} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="font-medium whitespace-nowrap">{t("governance.active_account")}:</div>
      <HTMLSelect value={selectedAddress || ""} onChange={handleAccountChange} className={Classes.HTML_SELECT}>
        <option value="">{t("governance.select_account")}</option>
        {accounts.map((account) => (
          <option key={account.address} value={account.address}>
            {account.meta.name || <AccountName address={account.address} />}
          </option>
        ))}
      </HTMLSelect>
    </div>
  );
}
