import { useCallback, useEffect, useState } from "react";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { Alignment, Button, Intent, Menu, MenuDivider, MenuItem, NavbarGroup, Position, Spinner, SpinnerSize } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { useAtomValue } from "jotai";
import { polkadotApiAtom, toasterAtom } from "../../atoms";
import DialogImportAddress from "../dialogs/DialogImportAddress";
import DialogCreateAddress from "../dialogs/DialogCreateAddress";
import Account from "./Account.client";
import DialogSendFunds from "../dialogs/DialogSendFunds";
import { KeyringPair } from "@polkadot/keyring/types";

const ss58format = {
  test: 72,
  live: 71,
};
const MAX_ADDRESSES_TO_SHOW = 3;

export default function Wallet() {
  const api = useAtomValue(polkadotApiAtom);
  const toaster = useAtomValue(toasterAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [pairs, setPairs] = useState([]);
  const [isDialogImportAddressMnemonicSeedOpen, setIsDialogImportAddressMnemonicSeedOpen] = useState(false);
  const [isDialogImportAddressJSONOpen, setIsDialogImportAddressJSONOpen] = useState(false);
  const [isDialogCreateAddressOpen, setIsDialogCreateAddressOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [sendDialogPair, setSendDialogPair] = useState(null);
  const handleSendDialogClose = useCallback(() => setIsSendDialogOpen(false), []);

  function handleSeedPhraseImportClick(value) {
    try {
      keyring.addUri(value);
      setIsDialogImportAddressMnemonicSeedOpen(false);
    } catch (e) {
      toaster &&
        toaster.show({
          icon: "ban-circle",
          intent: Intent.DANGER,
          message: e.message,
        });
    }
  }

  function handleSendClick(pair: KeyringPair) {
    setSendDialogPair(pair);
    setIsSendDialogOpen(true);
  }

  function handleJSONWalletImportClick(value) {
    try {
      const pair = keyring.createFromJson(JSON.parse(value));
      keyring.addPair(pair, "");
      setIsDialogImportAddressJSONOpen(false);
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
      <DialogImportAddress
        isOpen={isDialogImportAddressMnemonicSeedOpen}
        onClose={() => setIsDialogImportAddressMnemonicSeedOpen(false)}
        onImport={handleSeedPhraseImportClick}
      />
      <DialogImportAddress
        isOpen={isDialogImportAddressJSONOpen}
        onClose={() => setIsDialogImportAddressJSONOpen(false)}
        onImport={handleJSONWalletImportClick}
      />
      <DialogCreateAddress isOpen={isDialogCreateAddressOpen} onClose={() => setIsDialogCreateAddressOpen(false)} />
      <DialogSendFunds pair={sendDialogPair} isOpen={isSendDialogOpen} onAfterSubmit={handleSendDialogClose} onClose={handleSendDialogClose} />
      {pairs.slice(0, MAX_ADDRESSES_TO_SHOW).map((pair) => {
        return <Account key={pair.address} pair={pair} handleSendClick={handleSendClick} />;
      })}
      {pairs.length > MAX_ADDRESSES_TO_SHOW && (
        <Popover2
          minimal={true}
          position={Position.BOTTOM_LEFT}
          content={
            <Menu>
              {pairs.slice(MAX_ADDRESSES_TO_SHOW).map((pair) => {
                return (
                  <div key={pair.address}>
                    <Account pair={pair} hideAddressOnSmallScreen={false} handleSendClick={handleSendClick} />
                  </div>
                );
              })}
            </Menu>
          }
        >
          <Button icon="more" minimal={true} />
        </Popover2>
      )}
      <Popover2
        minimal={true}
        position={Position.BOTTOM_LEFT}
        content={
          <Menu>
            <MenuItem icon="new-object" text="Create new address..." onClick={() => setIsDialogCreateAddressOpen(true)} />
            <MenuDivider />
            <MenuItem icon="add" text="Import from seed phrase..." onClick={() => setIsDialogImportAddressMnemonicSeedOpen(true)} />
            <MenuItem icon="import" text="Import from JSON..." onClick={() => setIsDialogImportAddressJSONOpen(true)} />
          </Menu>
        }
      >
        <Button icon="plus" minimal={true} />
      </Popover2>
    </NavbarGroup>
  );
}
