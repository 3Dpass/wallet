import { useEffect, useState } from "react";
import { cryptoWaitReady, mnemonicGenerate } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { Icon, Menu, MenuItem, Spinner, SpinnerSize } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import ImportSeedPhraseDialog from "./ImportSeedPhraseDialog";
import Account from "./Account";
import { useAtomValue } from "jotai";
import { polkadotApiAtom } from "../state";

const ss58format = {
  test: 72,
  live: 71,
};

export default function Wallet() {
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [isSeedPhraseDialogOpen, setIsSeedPhraseDialogOpen] = useState(false);
  const api = useAtomValue(polkadotApiAtom);

  function handleGenerateAddressClick() {
    const mnemonic = mnemonicGenerate();
    keyring.addUri(mnemonic);
  }

  function handleSeedPhraseDialogOpen() {
    setIsSeedPhraseDialogOpen(true);
  }

  useEffect(() => {
    let sub;
    cryptoWaitReady().then(() => {
      keyring.loadAll({ ss58Format: ss58format.test, type: "sr25519" });
      sub = keyring.accounts.subject.subscribe(() => {
        setAccounts(keyring.getAccounts());
      });
      setIsLoading(false);
    });

    return () => {
      sub.unsubscribe();
    };
  }, []);

  if (isLoading || !api) {
    return <Spinner size={SpinnerSize.SMALL} />;
  }

  return (
    <div className="bp4-navbar-group bp4-align-right">
      <ImportSeedPhraseDialog isOpen={isSeedPhraseDialogOpen} onClose={() => setIsSeedPhraseDialogOpen(false)} />
      {accounts.map((account) => {
        return <Account key={account.address} address={account.address} />;
      })}
      <Popover2
        content={
          <Menu>
            <MenuItem icon="add" text="Import seed phrase..." onClick={handleSeedPhraseDialogOpen} />
            <MenuItem icon="random" text="Generate random wallet" onClick={handleGenerateAddressClick} />
          </Menu>
        }
        position="bottom-left"
      >
        <button className="bp4-button bp4-minimal">
          <Icon icon="plus" />
        </button>
      </Popover2>
    </div>
  );
}
