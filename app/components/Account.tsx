import { Menu, MenuDivider, MenuItem, Spinner, SpinnerSize } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import Identicon from "@polkadot/react-identicon";
import keyring from "@polkadot/ui-keyring";
import { useAtomValue } from "jotai";
import { polkadotApiAtom } from "../state";
import type { AccountInfoWithDualRefCount } from "@polkadot/types/interfaces/system/types";
import { useState } from "react";

export default function Account({ address }) {
  const api = useAtomValue(polkadotApiAtom);
  const [balanceIsLoading, setBalanceIsLoading] = useState(true);
  const [freeBalance, setFreeBalance] = useState(null);
  const [reservedBalance, setReservedBalance] = useState(null);

  async function handleOnMenuOpening() {
    if (!api) {
      return;
    }
    const account = await api.query.system.account<AccountInfoWithDualRefCount>(address);
    setFreeBalance(account.data.free.toHuman());
    setReservedBalance(account.data.reserved.toHuman());
    setBalanceIsLoading(false);
  }

  const menu = (
    <Menu>
      <MenuDivider title="Balance" />
      {balanceIsLoading && <Spinner size={SpinnerSize.SMALL} className="my-5" />}
      {!balanceIsLoading && (
        <>
          <MenuItem disabled={true} icon="cube" text={`Free: ${freeBalance}`} />
          <MenuItem disabled={true} icon="snowflake" text={`Reserved: ${reservedBalance}`} />
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
      <Popover2 content={menu} onOpening={handleOnMenuOpening} position="bottom">
        <button className="bp4-button bp4-minimal">
          <Identicon value={address} size={16} theme="substrate" />
          <div className="max-w-[200px] text-ellipsis overflow-hidden">{address}</div>
        </button>
      </Popover2>
    </>
  );
}
