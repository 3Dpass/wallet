import { useTranslation } from "react-i18next";
import { Spinner, Button, Icon } from "@blueprintjs/core";
import { Select, ItemRenderer } from "@blueprintjs/select";
import { AccountName } from "app/components/common/AccountName";
import { useEffect, useState } from "react";

interface AddressSelectProps {
  onAddressChange: (address: string | null) => void;
  selectedAddress?: string | null;
  addresses: string[];
  isLoading?: boolean;
}

const AddressSelectList = Select<string>;

const renderAddress: ItemRenderer<string> = (address, { handleClick, modifiers }) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return (
    <div key={address} onClick={handleClick} className={`px-3 py-2 cursor-pointer hover:bg-gray-600 ${modifiers.active ? "bg-gray-600" : ""}`}>
      <AccountName address={address} noLink={true} />
    </div>
  );
};

export function AddressSelect({ onAddressChange, selectedAddress, addresses, isLoading = false }: AddressSelectProps) {
  const { t } = useTranslation();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only set default address if we haven't initialized yet and there's no stored selection
    if (!hasInitialized && addresses.length > 0 && !selectedAddress) {
      const storedAddress = localStorage.getItem("lastSelectedAccount_v1");
      if (!storedAddress) {
        onAddressChange(addresses[0]);
      }
      setHasInitialized(true);
    }
  }, [addresses, selectedAddress, onAddressChange, hasInitialized]);

  if (isLoading) {
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
      <AddressSelectList
        items={addresses}
        activeItem={addresses.find((address) => address === selectedAddress)}
        onItemSelect={(address: string) => onAddressChange(address)}
        itemRenderer={renderAddress}
        filterable={false}
        popoverProps={{ minimal: true }}
        className="w-full"
      >
        <Button className="w-full justify-between items-center bg-gray-700 hover:bg-gray-600" rightIcon="caret-down">
          {selectedAddress ? (
            <AccountName address={selectedAddress} short={true} noLink={true} />
          ) : (
            <span className="text-gray-400">{t("governance.select_account")}</span>
          )}
        </Button>
      </AddressSelectList>
    </div>
  );
}
