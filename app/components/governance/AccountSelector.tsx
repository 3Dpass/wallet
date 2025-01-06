import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, Classes, HTMLSelect, Intent } from "@blueprintjs/core";
import { useAccounts } from "app/components/Api";
import { AccountName } from "app/components/common/AccountName";

interface AccountSelectorProps {
  onAccountChange: (address: string | null) => void;
  selectedAddress?: string | null;
}

export function AccountSelector({ onAccountChange, selectedAddress }: AccountSelectorProps) {
  const { t } = useTranslation();
  const accounts = useAccounts();
  const [selected, setSelected] = useState<string | null>(selectedAddress || null);

  useEffect(() => {
    // If we have accounts but no selection, default to first account
    if (accounts.length > 0 && !selected) {
      const firstAddress = accounts[0].address;
      setSelected(firstAddress);
      onAccountChange(firstAddress);
    }
  }, [accounts, selected, onAccountChange]);

  const handleAccountChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const address = event.target.value || null;
    setSelected(address);
    onAccountChange(address);
  };

  if (accounts.length === 0) {
    return (
      <Card className="mb-4">
        <div className="text-center">
          <p className="mb-2">{t("governance.no_accounts")}</p>
          <Button intent={Intent.PRIMARY} icon="plus" text={t("root_wallet.lbl_btn_create_new_address")} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <div className="flex items-center gap-4">
        <div className="font-medium">{t("governance.active_account")}:</div>
        <HTMLSelect value={selected || ""} onChange={handleAccountChange} className={Classes.HTML_SELECT}>
          <option value="">{t("governance.select_account")}</option>
          {accounts.map((account) => (
            <option key={account.address} value={account.address}>
              {account.meta.name || <AccountName address={account.address} />}
            </option>
          ))}
        </HTMLSelect>
      </div>
    </Card>
  );
}
