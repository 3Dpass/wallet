import { Alert, Button, Intent, Menu, MenuDivider, MenuItem, Position, Spinner, SpinnerSize } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { useAtomValue } from "jotai";
import { apiAtom, toasterAtom } from "../../atoms";
import { useCallback, useState } from "react";
import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useNavigate } from "@remix-run/react";
import { AddressIcon } from "../common/AddressIcon";
import DialogUnlockAccount from "../dialogs/DialogUnlockAccount";
import DialogSendFunds from "../dialogs/DialogSendFunds";
import keyring from "@polkadot/ui-keyring";
import { FormattedAmount } from "../common/FormattedAmount";

type IProps = {
  pair: KeyringPair;
};

export default function Account({ pair }: IProps) {
  const api = useAtomValue(apiAtom);
  const toaster = useAtomValue(toasterAtom);
  const navigate = useNavigate();
  const [balances, setBalances] = useState<DeriveBalancesAll | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const toggleSendDialog = useCallback(() => {
    setIsSendDialogOpen(!isSendDialogOpen);
  }, [isSendDialogOpen]);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const toggleDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(!isDeleteDialogOpen);
  }, [isDeleteDialogOpen]);

  const [isDialogUnlockAccountOpen, setIsDialogUnlockAccountOpen] = useState(false);
  const toggleDialogUnlockAccount = useCallback(() => {
    setIsDialogUnlockAccountOpen(!isDialogUnlockAccountOpen);
  }, [isDialogUnlockAccountOpen]);

  function handleOnMenuOpening() {
    loadAccount();
  }

  async function handleCopyAddress() {
    await navigator.clipboard.writeText(pair.address);
    toaster &&
      toaster.show({
        icon: "tick",
        intent: Intent.SUCCESS,
        message: "Address copied to clipboard",
      });
  }

  async function handleCopyJson() {
    if (pair.isLocked) {
      handleUnlockAccount();
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(pair.toJson()));
    toaster &&
      toaster.show({
        icon: "tick",
        intent: Intent.SUCCESS,
        message: "Wallet JSON copied to clipboard",
      });
  }

  function handleUnlockAccount() {
    setIsDialogUnlockAccountOpen(true);
  }

  function handleSendClick() {
    setIsSendDialogOpen(true);
  }

  function handleAddressDelete() {
    keyring.forgetAccount(pair.address);
    toggleDeleteDialog();
  }

  async function handleUnlockFundsClick() {
    if (!api) {
      return;
    }
    setIsLoading(true);
    try {
      if (pair.isLocked) {
        handleUnlockAccount();
        return;
      }
      await api.tx.rewards.unlock(pair.address).signAndSend(pair);
      toaster &&
        toaster.show({
          icon: "tick",
          intent: Intent.SUCCESS,
          message: "Unlock request sent",
        });
    } catch (e) {
      toaster &&
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: e.message,
        });
    } finally {
      setIsLoading(false);
    }
  }

  function loadAccount() {
    if (!api) {
      return;
    }
    setBalances(undefined);
    api.derive.balances.all(pair.address).then((balances) => {
      setBalances(balances);
    });
  }

  const menu = (
    <Menu>
      <MenuItem icon="id-number" text="View details..." onClick={() => navigate(`address/${pair.address}`)}></MenuItem>
      <MenuItem icon="duplicate" text="Copy Address" onClick={handleCopyAddress} />
      <MenuItem icon="export" text="Copy JSON wallet" onClick={handleCopyJson} />
      <MenuDivider />
      {!balances && <Spinner size={SpinnerSize.SMALL} className="my-5" />}
      {balances && (
        <>
          <MenuItem
            disabled={true}
            icon="cube-add"
            text={
              <>
                Total balance: <FormattedAmount value={balances.freeBalance} />
              </>
            }
          />
          <MenuItem disabled={true} icon="cube" text={`Transferable: ${balances.availableBalance.toHuman()}`} />
          <MenuItem icon="send-to" text="Send funds..." onClick={handleSendClick} />
          <MenuDivider />
          <MenuItem disabled={true} icon="lock" text={`Locked: ${balances.lockedBalance.toHuman()}`} />
          {balances.lockedBalance.toBigInt() > 0 && <MenuItem icon="unlock" text="Unlock funds mined" onClick={handleUnlockFundsClick} />}
        </>
      )}
      <MenuDivider />
      <MenuItem icon="delete" text="Remove" onClick={toggleDeleteDialog} />
    </Menu>
  );

  return (
    <>
      <DialogSendFunds
        pair={pair}
        isOpen={isSendDialogOpen}
        onAfterSubmit={toggleSendDialog}
        handleUnlockAccount={handleUnlockAccount}
        onClose={toggleSendDialog}
      />
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
          Are you sure you want to delete address <code className="block my-3">{pair && pair.address}</code> from wallet?
        </p>
      </Alert>
      <DialogUnlockAccount pair={pair} isOpen={isDialogUnlockAccountOpen} onClose={toggleDialogUnlockAccount} />
      <Popover2 minimal={true} position={Position.BOTTOM_LEFT} content={menu} onOpening={handleOnMenuOpening}>
        <Button minimal={true} icon={<AddressIcon address={pair.address} />} disabled={isLoading}>
          <div className="font-mono max-w-[50px] lg:max-w-[200px] text-ellipsis overflow-hidden">{pair.address}</div>
        </Button>
      </Popover2>
    </>
  );
}
