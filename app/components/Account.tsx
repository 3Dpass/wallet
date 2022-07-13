import { Button, Intent, Menu, MenuDivider, MenuItem, Position, Spinner, SpinnerSize } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import Identicon from "@polkadot/react-identicon";
import keyring from "@polkadot/ui-keyring";
import { useAtomValue } from "jotai";
import { polkadotApiAtom, toasterAtom } from "../atoms";
import { useState } from "react";
import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import { formatBalance } from "@polkadot/util";
import DialogSendFunds from "./DialogSendFunds";
import type { KeyringPair } from "@polkadot/keyring/types";

type AccountProps = {
  pair: KeyringPair;
};

export default function Account({ pair }: AccountProps) {
  const api = useAtomValue(polkadotApiAtom);
  const toaster = useAtomValue(toasterAtom);
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
      {!balances && <Spinner size={SpinnerSize.SMALL} className="my-5" />}
      {balances && (
        <>
          <MenuDivider title={`Total balance: ${formatBalance(balances.freeBalance, formatOptions)}`} />
          <MenuItem disabled={true} icon="cube" text={`Transferable: ${balances.availableBalance.toHuman()}`} />
          <MenuItem disabled={true} icon="lock" text={`Locked: ${balances.lockedBalance.toHuman()}`} />
          <MenuItem icon="send-to" text="Send funds..." onClick={handleSendMenuClick} />
        </>
      )}
      <MenuDivider />
      <MenuItem icon="duplicate" text="Copy Address" onClick={handleCopyAddress} />
      <MenuItem icon="export" text="Copy JSON wallet" onClick={handleCopyJson} />
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
        <Button minimal={true} icon={<Identicon value={pair.address} size={24} theme="substrate" />}>
          <div className="max-w-[100px] md:max-w-[200px] text-ellipsis overflow-hidden">{pair.address}</div>
        </Button>
      </Popover2>
    </>
  );
}
