import { useEffect, useRef, useState } from "react";
import { cryptoWaitReady, mnemonicGenerate } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { Icon, Intent, Menu, MenuDivider, MenuItem, Spinner, SpinnerSize, Toaster } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import ImportDialog from "./ImportDialog";
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
  const [isJSONWalletDialogOpen, setIsJSONWalletDialogOpen] = useState(false);
  const toaster = useRef<Toaster>();
  const api = useAtomValue(polkadotApiAtom);

  function handleGenerateAddressClick() {
    const mnemonic = mnemonicGenerate();
    keyring.addUri(mnemonic);
  }

  function handleSeedPhraseImportClick(value) {
    try {
      keyring.addUri(value);
      setIsSeedPhraseDialogOpen(false);
    } catch (e) {
      toaster.current.show({
        icon: "ban-circle",
        intent: Intent.DANGER,
        message: e.message,
      });
    }
  }

  function handleJSONWalletImportClick(value) {
    try {
      const pair = keyring.createFromJson(JSON.parse(value));
      keyring.addPair(pair, "");
      setIsJSONWalletDialogOpen(false);
    } catch (e) {
      toaster.current.show({
        icon: "ban-circle",
        intent: Intent.DANGER,
        message: e.message,
      });
    }
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
      <Toaster ref={toaster} />
      <ImportDialog isOpen={isSeedPhraseDialogOpen} onClose={() => setIsSeedPhraseDialogOpen(false)} onImport={handleSeedPhraseImportClick} />
      <ImportDialog isOpen={isJSONWalletDialogOpen} onClose={() => setIsJSONWalletDialogOpen(false)} onImport={handleJSONWalletImportClick} />
      {accounts.map((account) => {
        return <Account key={account.address} address={account.address} />;
      })}
      <Popover2
        content={
          <Menu>
            <MenuItem icon="random" text="Generate random wallet" onClick={handleGenerateAddressClick} />
            <MenuDivider />
            <MenuItem icon="add" text="Import seed phrase..." onClick={() => setIsSeedPhraseDialogOpen(true)} />
            <MenuItem icon="import" text="Import JSON wallet..." onClick={() => setIsJSONWalletDialogOpen(true)} />
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
