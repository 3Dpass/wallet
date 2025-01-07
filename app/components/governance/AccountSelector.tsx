import { useTranslation } from "react-i18next";
import { Spinner, Button } from "@blueprintjs/core";
import { Select, ItemRenderer } from "@blueprintjs/select";
import { useAccounts } from "app/components/Api";
import { AccountName } from "app/components/common/AccountName";
import { useEffect, useState } from "react";

interface AccountSelectorProps {
  onAccountChange: (address: string | null) => void;
  selectedAddress?: string | null;
}

interface Account {
  address: string;
}

const AccountSelect = Select.ofType<Account>();

const renderAccount: ItemRenderer<Account> = (account, { handleClick, modifiers }) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return (
    <div key={account.address} onClick={handleClick} className={`px-3 py-2 cursor-pointer hover:bg-gray-600 ${modifiers.active ? "bg-gray-600" : ""}`}>
      <AccountName address={account.address} noLink={true} />
    </div>
  );
};

export function AccountSelector({ onAccountChange, selectedAddress }: AccountSelectorProps) {
  const { t } = useTranslation();
  const accounts = useAccounts();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only set default account if we haven't initialized yet and there's no stored selection
    if (!hasInitialized && accounts.length > 0 && !selectedAddress) {
      const storedAccount = localStorage.getItem("lastSelectedAccount_v1");
      if (!storedAccount) {
        onAccountChange(accounts[0].address);
      }
      setHasInitialized(true);
    }
  }, [accounts, selectedAddress, onAccountChange, hasInitialized]);

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
      <AccountSelect
        items={accounts}
        activeItem={accounts.find((account) => account.address === selectedAddress)}
        onItemSelect={(item: Account) => onAccountChange(item.address)}
        itemRenderer={renderAccount}
        filterable={false}
        popoverProps={{ minimal: true }}
        className="w-full"
      >
        <Button className="w-full justify-between items-center bg-gray-700 hover:bg-gray-600">
          {selectedAddress ? (
            <AccountName address={selectedAddress} short={true} noLink={true} />
          ) : (
            <span className="text-gray-400">{t("governance.select_account")}</span>
          )}
        </Button>
      </AccountSelect>
    </div>
  );
}
