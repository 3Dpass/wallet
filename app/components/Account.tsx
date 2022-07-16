import { Button, Intent, Menu, MenuDivider, MenuItem, Position, Spinner, SpinnerSize } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import keyring from "@polkadot/ui-keyring";
import { useAtomValue } from "jotai";
import { polkadotApiAtom, toasterAtom } from "../atoms";
import { useState } from "react";
import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import { formatBalance } from "@polkadot/util";
import DialogSendFunds from "./dialogs/DialogSendFunds";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useNavigate } from "@remix-run/react";
import { AddressIcon } from "./common/AddressIcon";

type AccountProps = {
  pair: KeyringPair;
};

export default function Account({ pair }: AccountProps) {
  const api = useAtomValue(polkadotApiAtom);
  const toaster = useAtomValue(toasterAtom);
  const navigate = useNavigate();
  const [balances, setBalances] = useState<DeriveBalancesAll | undefined>(undefined);
  const [formatOptions, setFormatOptions] = useState({});
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);

  function handleOnMenuOpening() {
    loadAccount();
  }

  function handleSendMenuClick() {
    setIsSendDialogOpen(true);
  }

  function handleSendDialogAfterSubmit() {
    setIsSendDialogOpen(false);
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
          <MenuItem icon="send-to" text="Send funds..." onClick={handleSendMenuClick} />
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

  return (
    <>
      <DialogSendFunds pair={pair} isOpen={isSendDialogOpen} onAfterSubmit={handleSendDialogAfterSubmit} onClose={() => setIsSendDialogOpen(false)} />
      <Popover2 minimal={true} position={Position.BOTTOM_LEFT} content={menu} onOpening={handleOnMenuOpening}>
        <Button minimal={true} icon={<AddressIcon address={pair.address} className="mt-1" />}>
          <div className="max-w-[70px] sm:max-w-[120px] lg:max-w-[300px] text-ellipsis overflow-hidden">{pair.address}</div>
        </Button>
      </Popover2>
    </>
  );
}
