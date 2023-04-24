import { Button, Classes, Dialog, Intent, MenuItem } from "@blueprintjs/core";
import { ItemPredicate, ItemRenderer, Select2 } from "@blueprintjs/select";
import { MouseEventHandler, useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";

import type { SignerOptions } from "@polkadot/api/types";
import { signAndSend } from "../../utils/sign";
import { IPalletIdentityRegistrarInfo } from "../common/UserCard";
import UserCard from "../common/UserCard";
import useApi from "../../hooks/useApi";
import useToaster from "../../hooks/useToaster";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

type IIdentityData = {
    registrarList: IPalletIdentityRegistrarInfo[];
    isRegistrar: boolean;
    registrarData: IPalletIdentityRegistrarInfo | null
}

export default function DialogIdentity({ isOpen, onClose, pair }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dataInitial: IIdentityData = {
    registrarList: [],
    isRegistrar: false,
    registrarData: null,
  };
  const [data, setData] = useState(dataInitial);

  async function loadRegistrars() {
    if (!api) { return; }
    const registrars: Object[] = (await api.query.identity.registrars()).toHuman() as Object[];
    if (!registrars || !Array.isArray(registrars)) { return; }
    const registrarsList: IPalletIdentityRegistrarInfo[] = [];
    let isRegistrar: boolean = false;
    registrars.forEach((r, i) => {
        registrarsList.push({...(r as IPalletIdentityRegistrarInfo), regIndex: (i + 1)});
        isRegistrar = isRegistrar || (r as IPalletIdentityRegistrarInfo).account == pair.address;
    });
    setData((prev) => ({ ...prev, registrarList: registrarsList, isRegistrar: isRegistrar}));
    // if (isRegistrar) {
    if (true) {
        const registrarInfo = (await api.query.identity.identityOf(pair.address)).toHuman();
        setData((prev) => ({ ...prev, registrarData: (registrarInfo as IPalletIdentityRegistrarInfo)}));
        const requestedIdentity = (await api.query.identity.subsOf('d1CJYEbtNDtKWR3gdEABQRynTbcVi1u9AFTF9J6yCSazgYW1h')).toHuman();
        console.log('requestedIdentity', requestedIdentity);


    }
  }

  function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
    void loadRegistrars();
  }

  useEffect(() => {
    setCanSubmit(api !== undefined);
  }, [api]);

  async function handleSubmitRequestForJudgement() {
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
      const re = /\,/gi;
      const tx = api.tx.identity.requestJudgement(
        data.registrarData?.regIndex,
        data.registrarData?.fee.replace(re, '')
      );
      const options: Partial<SignerOptions> = {};
      await signAndSend(tx, pair, options);
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: "You requested for judgement",
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

  async function handleSubmitAddJudgement(target: string) {
    if (!api) {
      return;
    }
    if (pair.isLocked && !pair.meta.isInjected) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "Account is locked",
      });
      return;
    }
    setIsLoading(true);
    try {
      const tx = api.tx.identity.provideJudgement(data.registrarData?.regIndex, target, null);
      const options: Partial<SignerOptions> = {};
      await signAndSend(tx, pair, options);
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: "You requested for judgement",
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
    setData((prev) => ({ ...prev, registrarData: registrarAccount }));
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
        {!data.isRegistrar && !Boolean(pair.meta.isInjected) && (
            <>
                <Select2
                items={data.registrarList}
                itemPredicate={filterRegistrar}
                itemRenderer={renderRegistrar}
                noResults={<MenuItem disabled={true} text="No results." roleStructure="listoption" />}
                onItemSelect={setRegistrar}
                popoverProps={{ matchTargetWidth: true }}
                fill={true}
                >
                <Button
                    text={data.registrarData?.account}
                    rightIcon="double-caret-vertical"
                    placeholder="Select a registrar"
                    className={`${Classes.CONTEXT_MENU} ${Classes.FILL}`}
                />
                </Select2>
                {data.registrarData && (
                    <>
                        <Button
                            intent={Intent.PRIMARY}
                            disabled={isLoading || !canSubmit}
                            onClick={handleSubmitRequestForJudgement}
                            loading={isLoading}
                            text="Request for judgement"
                        />
                        <UserCard registrarInfo={data.registrarData} />
                    </>
                )}
            </>
        )}
        {!data.isRegistrar && Boolean(pair.meta.isInjected) && (
            <div>You already have identity</div>
        )}
        {data.isRegistrar && data.registrarData && (
            <>
                <Button
                    intent={Intent.PRIMARY}
                    disabled={isLoading || !canSubmit}
                    onClick={() => { handleSubmitAddJudgement('')}}
                    loading={isLoading}
                    text="Add judgement"
                />
                <UserCard registrarInfo={data.registrarData} />
            </>        
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
        </div>
      </div>
    </Dialog>
  );
}
