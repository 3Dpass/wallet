import { useEffect, useState } from "react";
import { cryptoWaitReady, mnemonicGenerate } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { Alignment, Button, Intent, Menu, MenuDivider, MenuItem, NavbarGroup, Position, Spinner, SpinnerSize } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import DialogImportAccount from "./DialogImportAccount";
import Account from "./Account";
import { useAtomValue } from "jotai";
import { polkadotApiAtom, toasterAtom } from "../atoms";

const ss58format = {
  test: 72,
  live: 71,
};

export default function Wallet() {
  const api = useAtomValue(polkadotApiAtom);
  const toaster = useAtomValue(toasterAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [pairs, setPairs] = useState([]);
  const [isSeedPhraseDialogOpen, setIsSeedPhraseDialogOpen] = useState(false);
  const [isJSONWalletDialogOpen, setIsJSONWalletDialogOpen] = useState(false);

  function handleGenerateAddressClick() {
    const mnemonic = mnemonicGenerate();
    keyring.addUri(mnemonic);
  }

  function handleSeedPhraseImportClick(value) {
    try {
      keyring.addUri(value);
      setIsSeedPhraseDialogOpen(false);
    } catch (e) {
      toaster &&
        toaster.show({
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
      toaster &&
        toaster.show({
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
        setPairs(keyring.getPairs());
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
    <NavbarGroup align={Alignment.RIGHT}>
      <DialogImportAccount isOpen={isSeedPhraseDialogOpen} onClose={() => setIsSeedPhraseDialogOpen(false)} onImport={handleSeedPhraseImportClick} />
      <DialogImportAccount isOpen={isJSONWalletDialogOpen} onClose={() => setIsJSONWalletDialogOpen(false)} onImport={handleJSONWalletImportClick} />
      {pairs.map((pair) => {
        return <Account key={pair.address} pair={pair} />;
      })}
      <Popover2
        minimal={true}
        position={Position.BOTTOM_LEFT}
        content={
          <Menu>
            <MenuItem icon="random" text="Generate random wallet" onClick={handleGenerateAddressClick} />
            <MenuDivider />
            <MenuItem icon="add" text="Import seed phrase..." onClick={() => setIsSeedPhraseDialogOpen(true)} />
            <MenuItem icon="import" text="Import JSON wallet..." onClick={() => setIsJSONWalletDialogOpen(true)} />
          </Menu>
        }
      >
        <Button icon="plus" minimal={true} />
      </Popover2>
    </NavbarGroup>
  );
}
