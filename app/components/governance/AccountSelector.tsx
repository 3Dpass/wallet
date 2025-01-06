import { useTranslation } from "react-i18next";
import { Button, Spinner, Icon } from "@blueprintjs/core";
import { useAccounts } from "app/components/Api";
import { AccountName } from "app/components/common/AccountName";
import { useEffect, useRef, useState } from "react";

interface AccountSelectorProps {
  onAccountChange: (address: string | null) => void;
  selectedAddress?: string | null;
}

export function AccountSelector({ onAccountChange, selectedAddress }: AccountSelectorProps) {
  const { t } = useTranslation();
  const accounts = useAccounts();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If we have accounts but no selection, default to first account
    if (accounts.length > 0 && !selectedAddress) {
      onAccountChange(accounts[0].address);
    }
  }, [accounts, selectedAddress, onAccountChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (accounts.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="font-medium whitespace-nowrap">{t("governance.active_account")}:</div>
        <Spinner size={16} />
      </div>
    );
  }

  const selectedAccount = accounts.find((account) => account.address === selectedAddress);

  return (
    <div className="flex items-center gap-2">
      <div className="font-medium whitespace-nowrap">{t("governance.active_account")}:</div>
      <div className="relative w-full max-w-md" ref={dropdownRef}>
        <Button
          className="w-full justify-between items-center bg-gray-700 hover:bg-gray-600 !pr-2"
          onClick={() => setIsOpen(!isOpen)}
          rightIcon="caret-down"
        >
          <div className="pointer-events-none truncate">
            {selectedAccount ? (
              <AccountName key={selectedAccount.address} address={selectedAccount.address} short={true} />
            ) : (
              <span className="text-gray-400">{t("governance.select_account")}</span>
            )}
          </div>
        </Button>

        {isOpen && (
          <div className="absolute z-50 w-[max-content] min-w-full mt-1 bg-gray-700 rounded-md shadow-lg max-h-96 overflow-y-auto">
            {accounts.map((account) => (
              <div
                key={account.address}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-600 ${account.address === selectedAddress ? "bg-gray-600" : ""}`}
                onClick={() => {
                  onAccountChange(account.address);
                  setIsOpen(false);
                }}
              >
                <div className="pointer-events-none">
                  <AccountName address={account.address} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
