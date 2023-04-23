import { Button, Classes, Dialog, Intent, MenuItem } from "@blueprintjs/core";
import { ItemPredicate, ItemRenderer, Select2 } from "@blueprintjs/select";
import { MouseEventHandler, useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";

import type { SignerOptions } from "@polkadot/api/types";
import { signAndSend } from "../../utils/sign";
import useApi from "../../hooks/useApi";
import useToaster from "../../hooks/useToaster";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

type IRegistrarInfoItem = {
    Raw: string;
}

type IRegistrarInfo = {
    display: IRegistrarInfoItem;
    email: IRegistrarInfoItem;
    web: IRegistrarInfoItem;
    twitter: IRegistrarInfoItem;
    // image: Any;
}

type IPalletIdentityRegistrarInfo = {
    account: string;
    fee: number;
    fields: number[];
    info: IRegistrarInfo;
    judgements: string[][];
}

type IIdentityData = {
    registrarList: IPalletIdentityRegistrarInfo[];
    isRegistrar: boolean;
    selectedRegistrar: IPalletIdentityRegistrarInfo | null
}

export default function DialogIdentity({ isOpen, onClose, pair }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dataInitial: IIdentityData = {
    registrarList: [],
    isRegistrar: false,
    selectedRegistrar: null,
  };
  const [data, setData] = useState(dataInitial);

  async function loadRegistrars() {
    if (!api) { return; }
    const registrars: Object[] = (await api.query.identity.registrars()).toHuman() as Object[];
    if (!registrars || !Array.isArray(registrars)) { return; }
    const registrarsList: IPalletIdentityRegistrarInfo[] = [];
    let isRegistrar: boolean = false;
    registrars.forEach((r) => {
        registrarsList.push(r as IPalletIdentityRegistrarInfo);
        isRegistrar = isRegistrar || (r as IPalletIdentityRegistrarInfo).account == pair.address;
    });
    setData((prev) => ({ ...prev, registrarList: registrarsList, isRegistrar: isRegistrar}));
  }

  function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
    void loadRegistrars();
  }

  useEffect(() => {
    setCanSubmit(api !== undefined);
  }, [api, {}]);

  async function handleSubmitClick() {
    if (!api) {
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "Account is locked",
      });
      return;
    }
    setIsLoading(true);
    try {
    //   const tx = api.tx.miningPool.addMemberSelf(data.poolToJoin);
    //   const options: Partial<SignerOptions> = {};
    //   await signAndSend(tx, pair, options);
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: "You have joined the mining pool",
      });
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
    } finally {
      setIsLoading(false);
      onClose();
    }
  }

  async function setRegistrar(registrarAccount: IPalletIdentityRegistrarInfo) {
    if (!api) {
        return;
    }
    const registrarInfo = (await api.query.identity.identityOf(registrarAccount.account)).toHuman();
    registrarAccount = {...registrarAccount, ...(registrarInfo as IPalletIdentityRegistrarInfo)};
    console.log('registrarAccount: ', registrarAccount);
    setData((prev) => ({ ...prev, selectedRegistrar: registrarAccount }));
  }

  const filterRegistrar: ItemPredicate<IPalletIdentityRegistrarInfo> = (query, registrar, _index, exactMatch) => {
    const normalizedId = registrar.account.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    if (exactMatch) {
        return normalizedId === normalizedQuery;
    } else {
        return normalizedId.indexOf(normalizedQuery) >= 0;
    }
  };

  const renderRegistrar: ItemRenderer<IPalletIdentityRegistrarInfo> = (registrar, { handleClick, handleFocus, modifiers, query }) => {
    if (!modifiers.matchesPredicate) {
        return null;
    }
    return (
        <MenuItem
            active={modifiers.active}
            disabled={modifiers.disabled}
            key={registrar.account}
            label={registrar.account}
            onClick={handleClick as MouseEventHandler}
            onFocus={handleFocus}
            roleStructure="listoption"
            text=""
        />
    );
  };

  return (
    <Dialog isOpen={isOpen} usePortal={true} onOpening={handleOnOpening} title="Identity" onClose={onClose} className="w-[90%] sm:w-[640px]">
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        {!data.isRegistrar && (
            <Select2<IPalletIdentityRegistrarInfo>
            items={data.registrarList}
            itemPredicate={filterRegistrar}
            itemRenderer={renderRegistrar}
            noResults={<MenuItem disabled={true} text="No results." roleStructure="listoption" />}
            onItemSelect={setRegistrar}
            popoverProps={{ matchTargetWidth: true }}
            fill={true}
            >
            <Button
                text={data.selectedRegistrar?.account}
                rightIcon="double-caret-vertical"
                placeholder="Select a registrar"
                className={`${Classes.CONTEXT_MENU} ${Classes.FILL}`}
            />
            </Select2>
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose} text="Cancel" disabled={isLoading} />
          <Button
            intent={Intent.PRIMARY}
            disabled={isLoading || !canSubmit}
            onClick={handleSubmitClick}
            icon="add"
            loading={isLoading}
            text="Select the registrar"
          />
        </div>
      </div>
    </Dialog>
  );
}
