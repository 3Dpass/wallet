import { Intent, Menu, MenuDivider, MenuItem, Spinner, SpinnerSize, Toaster } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import Identicon from "@polkadot/react-identicon";
import keyring from "@polkadot/ui-keyring";
import { useAtomValue } from "jotai";
import { polkadotApiAtom } from "../state";
import { useRef, useState } from "react";
import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import { formatBalance } from "@polkadot/util";
import DialogSendFunds from "./DialogSendFunds";

export default function Account({ address }) {
  const api = useAtomValue(polkadotApiAtom);
  const [balances, setBalances] = useState<DeriveBalancesAll | undefined>(undefined);
  const [formatOptions, setFormatOptions] = useState({});
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const toaster = useRef<Toaster>();

  function handleOnMenuOpening() {
    loadAccount();
  }

  function handleSendMenuClick() {
    setIsSendDialogOpen(true);
  }

  function handleSendDialogSubmit(address) {
    setIsSendDialogOpen(false);
  }

  async function handleCopyJson() {
    const pair = keyring.getPair(address);
    await navigator.clipboard.writeText(JSON.stringify(pair.toJson()));
    toaster.current.show({
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
    api.derive.balances.all(address).then((balances) => {
      setBalances(balances);
      const registry = balances.freeBalance.registry;
      setFormatOptions({
        decimals: registry.chainDecimals[0],
        withSi: true,
        withUnit: registry.chainTokens[0],
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
      <MenuItem icon="export" text="Copy JSON wallet" onClick={handleCopyJson} />
      <MenuDivider />
      <MenuItem
        icon="delete"
        text="Remove"
        onClick={() => {
          keyring.forgetAccount(address);
        }}
      />
    </Menu>
  );

  return (
    <>
      <Toaster ref={toaster} />
      <DialogSendFunds isOpen={isSendDialogOpen} onSubmit={handleSendDialogSubmit} onClose={() => setIsSendDialogOpen(false)} />
      <Popover2 content={menu} onOpening={handleOnMenuOpening} position="bottom">
        <button className="bp4-button bp4-minimal">
          <Identicon value={address} size={16} theme="substrate" />
          <div className="max-w-[200px] text-ellipsis overflow-hidden">{address}</div>
        </button>
      </Popover2>
    </>
  );
}
