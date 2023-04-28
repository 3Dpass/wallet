import { Button, Classes, Dialog, InputGroup, Intent, MenuItem } from "@blueprintjs/core";
import { ItemPredicate, ItemRenderer, Select2 } from "@blueprintjs/select";
import { MouseEventHandler, useEffect, useState } from "react";
// import { decodeAddress } from "@polkadot/util-crypto/address/decode";
import type { KeyringPair } from "@polkadot/keyring/types";

import type { SignerOptions } from "@polkadot/api/types";
import { signAndSend } from "../../utils/sign";
import { IPalletIdentityRegistrarInfo } from "../common/UserCard";
import UserCard from "../common/UserCard";
import useApi from "../../hooks/useApi";
import useToaster from "../../hooks/useToaster";
// import { useSS58Format } from "../../hooks/useSS58Format";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

type ICandidateInfo = {
  display: string | null;
  legal: string | null;
  web: string | null;
  riot: string | null;
  email: string | null;
  discord: string | null;
  twitter: string | null;
}

type IIdentityData = {
    registrarList: IPalletIdentityRegistrarInfo[];
    isRegistrar: boolean;
    registrarData: IPalletIdentityRegistrarInfo | null;
    candidateInfo: ICandidateInfo;
}

export default function DialogIdentity({ isOpen, onClose, pair }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // const ss58format = useSS58Format();

  const dataInitial: IIdentityData = {
    registrarList: [],
    isRegistrar: false,
    registrarData: null,
    candidateInfo: {} as ICandidateInfo,
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
    if (isRegistrar) {
        const registrarInfo = (await api.query.identity.identityOf(pair.address)).toHuman();
        setData((prev) => ({ ...prev, registrarData: (registrarInfo as IPalletIdentityRegistrarInfo)}));
        console.log('registrarData: ', data.registrarData);
        // console.log(decodeAddress('0xca84e52a21186bb6747c1cbb294ec1ec713f575bae313676cad4c138af7c5731', true, ss58format));
    } else {
      setData((prev) => ({ ...prev, candidateInfo: {} as ICandidateInfo}));
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
      const tx0 = api.tx.identity.setIdentity(data.candidateInfo);
      await signAndSend(tx0, pair, {});
      const re = /\,/gi;
      const tx = api.tx.identity.requestJudgement(
        data.registrarData?.regIndex,
        data.registrarData?.fee.replace(re, '')
      );
      await signAndSend(tx, pair, {});
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
            text={registrar.fee}
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
                        <InputGroup
                          disabled={isLoading}
                          large={true}
                          className="font-mono"
                          spellCheck={false}
                          placeholder="Enter display name"
                          onChange={(e) => {let ci = data.candidateInfo; ci.display = e.target.value; setData(
                            (prev) => ({ ...prev, candidateInfo: ci })
                          )}}
                          value={data.candidateInfo.display || ''}
                        />
                        <InputGroup
                          disabled={isLoading}
                          large={true}
                          className="font-mono"
                          spellCheck={false}
                          placeholder="Enter legal name"
                          onChange={(e) => {let ci = data.candidateInfo; ci.legal = e.target.value; setData(
                            (prev) => ({ ...prev, candidateInfo: ci })
                          )}}
                          value={data.candidateInfo.legal || ''}
                        />
                        <InputGroup
                          disabled={isLoading}
                          large={true}
                          className="font-mono"
                          spellCheck={false}
                          placeholder="Enter email"
                          onChange={(e) => {let ci = data.candidateInfo; ci.email = e.target.value; setData(
                            (prev) => ({ ...prev, candidateInfo: ci })
                          )}}
                          value={data.candidateInfo.email || ''}
                        />
                        <InputGroup
                          disabled={isLoading}
                          large={true}
                          className="font-mono"
                          spellCheck={false}
                          placeholder="Enter web address"
                          onChange={(e) => {let ci = data.candidateInfo; ci.web = e.target.value; setData(
                            (prev) => ({ ...prev, candidateInfo: ci })
                          )}}
                          value={data.candidateInfo.web || ''}
                        />
                        <InputGroup
                          disabled={isLoading}
                          large={true}
                          className="font-mono"
                          spellCheck={false}
                          placeholder="Enter twitter"
                          onChange={(e) => {let ci = data.candidateInfo; ci.twitter = e.target.value; setData(
                            (prev) => ({ ...prev, candidateInfo: ci })
                          )}}
                          value={data.candidateInfo.twitter || ''}
                        />
                        <InputGroup
                          disabled={isLoading}
                          large={true}
                          className="font-mono"
                          spellCheck={false}
                          placeholder="Enter discord"
                          onChange={(e) => {let ci = data.candidateInfo; ci.discord = e.target.value; setData(
                            (prev) => ({ ...prev, candidateInfo: ci })
                          )}}
                          value={data.candidateInfo.discord || ''}
                        />
                        <InputGroup
                          disabled={isLoading}
                          large={true}
                          className="font-mono"
                          spellCheck={false}
                          placeholder="Enter riot name"
                          onChange={(e) => {let ci = data.candidateInfo; ci.riot = e.target.value; setData(
                            (prev) => ({ ...prev, candidateInfo: ci })
                          )}}
                          value={data.candidateInfo.riot || ''}
                        />
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
