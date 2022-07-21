import { useCallback, useEffect, useState } from "react";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { Alert, Alignment, Button, Intent, Menu, MenuDivider, MenuItem, NavbarGroup, Position, Spinner, SpinnerSize } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { useAtomValue } from "jotai";
import { apiAtom, toasterAtom } from "../../atoms";
import DialogImportAddress from "../dialogs/DialogImportAddress";
import DialogCreateAddress from "../dialogs/DialogCreateAddress";
import Account from "./Account.client";
import DialogSendFunds from "../dialogs/DialogSendFunds";
import type { KeyringPair } from "@polkadot/keyring/types";

const ss58format = {
  test: 72,
  live: 71,
};
const MAX_ADDRESSES_TO_SHOW = 3;

export default function Wallet() {
  const api = useAtomValue(apiAtom);
  const toaster = useAtomValue(toasterAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [pairs, setPairs] = useState([]);
  const [dialogPair, setDialogPair] = useState(null); // chosen pair for opened dialog window

  const [isDialogImportAddressMnemonicSeedOpen, setIsDialogImportAddressMnemonicSeedOpen] = useState(false);
  const toggleImportAddressMnemonicSeedOpen = useCallback(() => {
    setIsDialogImportAddressMnemonicSeedOpen(!isDialogImportAddressMnemonicSeedOpen);
  }, [isDialogImportAddressMnemonicSeedOpen]);

  const [isDialogImportAddressJSONOpen, setIsDialogImportAddressJSONOpen] = useState(false);
  const toggleImportAddressJSONOpen = useCallback(() => {
    setIsDialogImportAddressJSONOpen(!isDialogImportAddressJSONOpen);
  }, [isDialogImportAddressJSONOpen]);

  const [isDialogCreateAddressOpen, setIsDialogCreateAddressOpen] = useState(false);
  const toggleDialogCreateAddressOpen = useCallback(() => {
    setIsDialogCreateAddressOpen(!isDialogCreateAddressOpen);
  }, [isDialogCreateAddressOpen]);

  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const toggleSendDialog = useCallback(() => {
    setIsSendDialogOpen(!isSendDialogOpen);
  }, [isSendDialogOpen]);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const toggleDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(!isDeleteDialogOpen);
  }, [isDeleteDialogOpen]);

  function handleSeedPhraseImportClick(value) {
    try {
      keyring.addUri(value);
      toggleImportAddressMnemonicSeedOpen();
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
    setDialogPair(pair);
    setIsSendDialogOpen(true);
  }

  function handleJSONWalletImportClick(value) {
    try {
      const pair = keyring.createFromJson(JSON.parse(value));
      keyring.addPair(pair, "");
      toggleImportAddressJSONOpen();
    } catch (e) {
      toaster &&
        toaster.show({
          icon: "ban-circle",
          intent: Intent.DANGER,
          message: e.message,
        });
    }
  }

  function handleDeleteClick(pair: KeyringPair) {
    setDialogPair(pair);
    toggleDeleteDialog();
  }

  function handleAddressDelete() {
    keyring.forgetAccount(dialogPair.address);
    toggleDeleteDialog();
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
        onClose={toggleImportAddressMnemonicSeedOpen}
        onImport={handleSeedPhraseImportClick}
      />
      <DialogImportAddress isOpen={isDialogImportAddressJSONOpen} onClose={toggleImportAddressJSONOpen} onImport={handleJSONWalletImportClick} />
      <DialogCreateAddress isOpen={isDialogCreateAddressOpen} onClose={toggleDialogCreateAddressOpen} />
      <DialogSendFunds pair={dialogPair} isOpen={isSendDialogOpen} onAfterSubmit={toggleSendDialog} onClose={toggleSendDialog} />
      <Alert
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        icon="cross"
        intent={Intent.DANGER}
        isOpen={isDeleteDialogOpen}
        canEscapeKeyCancel={true}
        canOutsideClickCancel={true}
        onCancel={toggleDeleteDialog}
        onConfirm={handleAddressDelete}
      >
        <p>
          Are you sure you want to delete address <code className="block my-3">{dialogPair && dialogPair.address}</code> from wallet?
        </p>
      </Alert>
      {pairs.slice(0, MAX_ADDRESSES_TO_SHOW).map((pair) => {
        return <Account key={pair.address} pair={pair} handleSendClick={handleSendClick} handleDeleteClick={handleDeleteClick} />;
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
                    <Account pair={pair} hideAddressOnSmallScreen={false} handleSendClick={handleSendClick} handleDeleteClick={handleDeleteClick} />
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
            <MenuItem icon="new-object" text="Create new address..." onClick={toggleDialogCreateAddressOpen} />
            <MenuDivider />
            <MenuItem icon="add" text="Import from seed phrase..." onClick={toggleImportAddressMnemonicSeedOpen} />
            <MenuItem icon="import" text="Import from JSON..." onClick={toggleImportAddressJSONOpen} />
          </Menu>
        }
      >
        <Button icon="plus" minimal={true} />
      </Popover2>
    </NavbarGroup>
  );
}
