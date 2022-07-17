import { Button, Intent, Menu, MenuDivider, MenuItem, Position, Spinner, SpinnerSize } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import keyring from "@polkadot/ui-keyring";
import { useAtomValue } from "jotai";
import { polkadotApiAtom, toasterAtom } from "../atoms";
import { useState } from "react";
import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import { formatBalance } from "@polkadot/util";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useNavigate } from "@remix-run/react";
import { AddressIcon } from "./common/AddressIcon";

type AccountProps = {
  pair: KeyringPair;
  handleSendClick: (pair: KeyringPair) => void;
  hideAddressOnSmallScreen?: boolean;
};

export default function Account({ pair, handleSendClick, hideAddressOnSmallScreen = true }: AccountProps) {
  const api = useAtomValue(polkadotApiAtom);
  const toaster = useAtomValue(toasterAtom);
  const navigate = useNavigate();
  const [balances, setBalances] = useState<DeriveBalancesAll | undefined>(undefined);
  const [formatOptions, setFormatOptions] = useState({});

  function handleOnMenuOpening() {
    loadAccount();
  }

  async function handleCopyAddress() {
    await navigator.clipboard.writeText(pair.address);
    toaster &&
      toaster.show({
        icon: "tick",
        intent: Intent.SUCCESS,
        message: "Address copied to clipboard",
      });
  }

  async function handleCopyJson() {
    await navigator.clipboard.writeText(JSON.stringify(pair.toJson()));
    toaster &&
      toaster.show({
        icon: "tick",
        intent: Intent.SUCCESS,
        message: "Wallet JSON copied to clipboard",
      });
  }

  function loadAccount() {
    if (!api) {
      return;
    }
    setBalances(undefined);
    api.derive.balances.all(pair.address).then((balances) => {
      setBalances(balances);
      setFormatOptions({
        decimals: api.registry.chainDecimals[0],
        withSi: true,
        withUnit: api.registry.chainTokens[0],
      });
    });
  }

  const menu = (
    <Menu>
      <MenuItem icon="id-number" text="View details..." onClick={() => navigate(`address/${pair.address}`)}></MenuItem>
      <MenuItem icon="duplicate" text="Copy Address" onClick={handleCopyAddress} />
      <MenuItem icon="export" text="Copy JSON wallet" onClick={handleCopyJson} />
      <MenuDivider />
      {!balances && <Spinner size={SpinnerSize.SMALL} className="my-5" />}
      {balances && (
        <>
          <MenuItem disabled={true} icon="cube-add" text={`Total balance: ${formatBalance(balances.freeBalance, formatOptions)}`} />
          <MenuItem disabled={true} icon="cube" text={`Transferable: ${balances.availableBalance.toHuman()}`} />
          <MenuItem disabled={true} icon="lock" text={`Locked: ${balances.lockedBalance.toHuman()}`} />
          <MenuItem icon="send-to" text="Send funds..." onClick={() => handleSendClick(pair)} />
        </>
      )}
      <MenuDivider />
      <MenuItem
        icon="delete"
        text="Remove"
        onClick={() => {
          keyring.forgetAccount(pair.address);
        }}
      />
    </Menu>
  );

  let addressClassName = "font-mono max-w-[100px] lg:max-w-[200px] text-ellipsis overflow-hidden";
  if (hideAddressOnSmallScreen) {
    addressClassName += " hidden sm:block";
  }

  return (
    <>
      <Popover2 minimal={true} position={Position.BOTTOM_LEFT} content={menu} onOpening={handleOnMenuOpening}>
        <Button minimal={true} icon={<AddressIcon address={pair.address} className="mt-1" />}>
          <div className={addressClassName}>{pair.address}</div>
        </Button>
      </Popover2>
    </>
  );
}
