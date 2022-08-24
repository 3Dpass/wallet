import { useCallback, useEffect, useState } from "react";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { Alignment, Button, Intent, Menu, MenuDivider, MenuItem, NavbarGroup, Position, Spinner, SpinnerSize } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { useAtomValue } from "jotai";
import { apiAtom, toasterAtom } from "../../atoms";
import DialogImportAddress from "../dialogs/DialogImportAddress";
import DialogCreateAddress from "../dialogs/DialogCreateAddress";
import Account from "./Account.client";
import { useSS58Format } from "../hooks";

export default function Wallet() {
  const api = useAtomValue(apiAtom);
  const toaster = useAtomValue(toasterAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [pairs, setPairs] = useState([]);
  const ss58format = useSS58Format();

  const dialogsInitial = {
    mnemonic: false,
    json: false,
    create: false,
  };
  const [dialogs, setDialogs] = useState(dialogsInitial);
  const dialogToggle = useCallback((name: keyof typeof dialogsInitial) => {
    setDialogs((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  function handleSeedPhraseImportClick(value) {
    try {
      keyring.addUri(value);
      dialogToggle("mnemonic");
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
      dialogToggle("json");
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
      keyring.loadAll({ ss58Format: ss58format, type: "sr25519" });
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
      <DialogImportAddress isOpen={dialogs.mnemonic} onClose={() => dialogToggle("mnemonic")} onImport={handleSeedPhraseImportClick} />
      <DialogImportAddress isOpen={dialogs.json} onClose={() => dialogToggle("json")} onImport={handleJSONWalletImportClick} />
      <DialogCreateAddress isOpen={dialogs.create} onClose={() => dialogToggle("create")} />
      {pairs.map((pair) => {
        return <Account key={pair.address} pair={pair} />;
      })}
      <Popover2
        minimal={true}
        position={Position.BOTTOM_LEFT}
        content={
          <Menu>
            <MenuItem icon="new-object" text="Create new address..." onClick={() => dialogToggle("create")} />
            <MenuDivider />
            <MenuItem icon="add" text="Import from seed phrase..." onClick={() => dialogToggle("mnemonic")} />
            <MenuItem icon="import" text="Import from JSON..." onClick={() => dialogToggle("json")} />
          </Menu>
        }
      >
        <Button icon="plus" minimal={true} />
      </Popover2>
    </NavbarGroup>
  );
}
