import { Menu, MenuDivider, MenuItem, Spinner, SpinnerSize, Toaster } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import Identicon from "@polkadot/react-identicon";
import keyring from "@polkadot/ui-keyring";
import { useAtomValue } from "jotai";
import { polkadotApiAtom } from "../state";
import { useRef, useState } from "react";
import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import { formatBalance } from "@polkadot/util";

// TODO: retrieve seed phrase from local storage
const SHOW_COPY_SEED_PHRASE = false;

export default function Account({ address }) {
  const api = useAtomValue(polkadotApiAtom);
  const [balances, setBalances] = useState<DeriveBalancesAll | undefined>(undefined);
  const [formatOptions, setFormatOptions] = useState({});
  const toaster = useRef<Toaster>();

  function handleOnMenuOpening() {
    loadAccount();
  }

  async function handleCopySeedPhrase() {
    const seed_phrase = "TODO: retrieve seed phrase";
    await navigator.clipboard.writeText(seed_phrase);
    toaster.current.show({
      message: "Seed phrase copied to clipboard",
      intent: "success",
      icon: "tick",
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
        </>
      )}
      {SHOW_COPY_SEED_PHRASE && (
        <>
          <MenuDivider />
          <MenuItem icon="star" text="Copy seed phrase" onClick={handleCopySeedPhrase} />
        </>
      )}
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
      <Popover2 content={menu} onOpening={handleOnMenuOpening} position="bottom">
        <button className="bp4-button bp4-minimal">
          <Identicon value={address} size={16} theme="substrate" />
          <div className="max-w-[200px] text-ellipsis overflow-hidden">{address}</div>
        </button>
      </Popover2>
    </>
  );
}
