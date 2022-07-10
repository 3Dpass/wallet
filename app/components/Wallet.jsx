import { useEffect, useState } from "react";
import { cryptoWaitReady, mnemonicGenerate } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import Identicon from "@polkadot/react-identicon";
import { useAtomValue } from "jotai";
import { polkadotApi } from "../state";
import { Button, Classes, Dialog, Icon, Intent, Menu, MenuItem, Spinner, SpinnerSize, TextArea } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";

const ss58format = {
  test: 72,
  live: 71,
};

export default function Wallet() {
  const [isLoading, setIsLoading] = useState(true);
  const api = useAtomValue(polkadotApi);
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});

  const [isSeedPhraseDialogOpen, setIsSeedPhraseDialogOpen] = useState(false);
  const [seedPhraseValue, setSeedPhraseValue] = useState("");

  function handleSeedPhraseDialogOpen() {
    setIsSeedPhraseDialogOpen(true);
    setSeedPhraseValue("");
  }

  function handleSeedPhraseDialogCancel() {
    setIsSeedPhraseDialogOpen(false);
  }

  function handleSeedPhraseChange(e) {
    setSeedPhraseValue(e.target.value);
  }

  function handleSeedPhraseImportClick() {
    keyring.addUri(seedPhraseValue);
    setIsSeedPhraseDialogOpen(false);
  }

  function handleGenerateAddressClick() {
    const mnemonic = mnemonicGenerate();
    keyring.addUri(mnemonic);
  }

  function forgetAddress(address) {
    keyring.forgetAccount(address);
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

  useEffect(() => {
    if (!api) {
      return;
    }
    accounts.forEach((account) => {
      const { nonce, data: balance } = api.query.system.account(account.address);
      setBalances((prevBalances) => ({ ...prevBalances, [account.address]: { nonce, balance } }));
    });
  }, [api, accounts]);

  if (isLoading) {
    return <Spinner size={SpinnerSize.SMALL} />;
  }

  return (
    <div className="bp4-navbar-group bp4-align-right">
      <Dialog isOpen={isSeedPhraseDialogOpen} usePortal={true}>
        <div className={Classes.DIALOG_BODY}>
          <TextArea className="w-full" rows={5} onChange={handleSeedPhraseChange} value={seedPhraseValue} />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={handleSeedPhraseDialogCancel}>Cancel</Button>
            <Button intent={Intent.PRIMARY} onClick={handleSeedPhraseImportClick} icon="add">
              Import seed phrase
            </Button>
          </div>
        </div>
      </Dialog>
      {accounts.map((account) => {
        const menu = (
          <Menu>
            {balances[account.address] && balances[account.address].balance && <MenuItem>{balances[account.address].balance.free ?? "N/A"} 3dp</MenuItem>}
            <MenuItem
              icon="delete"
              text="Remove"
              onClick={() => {
                forgetAddress(account.address);
              }}
            />
          </Menu>
        );
        return (
          <div key={account.address}>
            <Popover2 content={menu} position="bottom">
              <button className="bp4-button bp4-minimal">
                <Identicon value={account.address} size={16} theme="substrate" />
                <div className="max-w-[200px] text-ellipsis overflow-hidden">{account.address}</div>
              </button>
            </Popover2>
          </div>
        );
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
