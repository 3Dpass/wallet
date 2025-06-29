import { Button, Spinner } from "@blueprintjs/core";
import { type ItemRenderer, Select } from "@blueprintjs/select";
import keyring from "@polkadot/ui-keyring";
import { AccountName } from "app/components/common/AccountName";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface AddressSelectProps {
  onAddressChange: (address: string | null) => void;
  selectedAddress?: string | null;
  addresses: string[];
  isLoading?: boolean;
  metadata?: Record<string, React.ReactNode>;
}

const AddressSelectList = Select<string>;

const renderAddressContent = (
  address: string,
  metadata?: Record<string, React.ReactNode>,
  short = false
) => {
  return (
    <div className="flex justify-between items-center w-full">
      <AccountName address={address} short={short} noLink={true} />
      {metadata?.[address]}
    </div>
  );
};

const renderAddressWithMetadata = (
  metadata?: Record<string, React.ReactNode>
) => {
  const renderer: ItemRenderer<string> = (
    address,
    { handleClick, modifiers }
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <div
        key={address}
        role="menuitem"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick(e as unknown as React.MouseEvent<HTMLElement>);
          }
        }}
        className={`w-full text-left px-3 py-2 cursor-pointer hover:bg-gray-600 ${modifiers.active ? "bg-gray-600" : ""}`}
      >
        {renderAddressContent(address, metadata)}
      </div>
    );
  };
  return renderer;
};

export function AddressSelect({
  onAddressChange,
  selectedAddress,
  addresses,
  isLoading = false,
  metadata,
}: AddressSelectProps) {
  const { t } = useTranslation();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!hasInitialized && addresses.length > 0 && !selectedAddress) {
      const storedAddress = localStorage.getItem("lastSelectedAccount_v1");
      if (!storedAddress) {
        // Try to find an injected account first (your accounts)
        const injectedAccount = addresses.find((address) => {
          try {
            const pair = keyring.getPair(address);
            return pair.meta.isInjected;
          } catch {
            return false;
          }
        });

        // If no injected account found, use the first account
        const defaultAccount = injectedAccount || addresses[0];
        onAddressChange(defaultAccount);
      }
      setHasInitialized(true);
    }
  }, [addresses, selectedAddress, onAddressChange, hasInitialized]);

  if (isLoading) {
    return <Spinner size={16} />;
  }

  return (
    <AddressSelectList
      items={addresses}
      activeItem={addresses.find((address) => address === selectedAddress)}
      onItemSelect={(address: string) => onAddressChange(address)}
      itemRenderer={renderAddressWithMetadata(metadata)}
      filterable={false}
      popoverProps={{
        minimal: true,
        popoverClassName: "max-h-[300px] overflow-auto min-w-full",
        className: "max-h-[300px]",
      }}
      className="w-full"
    >
      <Button
        fill
        className="w-full justify-between items-center"
        rightIcon="caret-down"
      >
        {selectedAddress ? (
          <div className="p-1">
            {renderAddressContent(selectedAddress, metadata, true)}
          </div>
        ) : (
          <span className="text-gray-400">
            {t("governance.select_account")}
          </span>
        )}
      </Button>
    </AddressSelectList>
  );
}
