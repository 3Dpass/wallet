import { Button, Classes, Dialog, InputGroup, Intent, MenuItem } from "@blueprintjs/core";
import { ItemPredicate, ItemRenderer, Select2 } from "@blueprintjs/select";
import { MouseEventHandler, useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";

import type { SignerOptions } from "@polkadot/api/types";
import { signAndSend, signAndSendWithSubscribtion } from "../../utils/sign";
import { IPalletIdentityRegistrarInfo } from "../common/UserCard";
import CandidateCards from "../common/CandidateCards";
import UserCard from "../common/UserCard";
import useApi from "../../hooks/useApi";
import useToaster from "../../hooks/useToaster";

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
};

type IIdentityData = {
  registrarList: IPalletIdentityRegistrarInfo[];
  isRegistrar: boolean;
  registrarData: IPalletIdentityRegistrarInfo | null;
  candidateInfo: ICandidateInfo;
  dateMonthAgo: Date;
};

export default function DialogIdentity({ isOpen, onClose, pair }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dataInitial: IIdentityData = {
    registrarList: [],
    isRegistrar: false,
    registrarData: null,
    candidateInfo: {} as ICandidateInfo,
    dateMonthAgo: new Date(),
  };
  const [dataState, setData] = useState(dataInitial);

  async function loadRegistrars() {
    if (!api) {
      return;
    }
    const registrars: Object[] = (await api.query.identity.registrars()).toHuman() as Object[];
    if (!registrars || !Array.isArray(registrars)) {
      return;
    }
    const registrarsList: IPalletIdentityRegistrarInfo[] = [];
    let isRegistrar: boolean = true;
    registrars.forEach((r, i) => {
      registrarsList.push({ ...(r as IPalletIdentityRegistrarInfo), regIndex: i + 1 });
      isRegistrar = isRegistrar || (r as IPalletIdentityRegistrarInfo).account == pair.address;
    });
    setData((prev) => ({ ...prev, isRegistrar: isRegistrar }));
    if (isRegistrar) {
      const registrarInfo = (await api.query.identity.identityOf(pair.address)).toHuman();
      setData((prev) => ({ ...prev, registrarData: registrarInfo as IPalletIdentityRegistrarInfo }));
      const dateMonthAgo = new Date();
      dateMonthAgo.setMonth(dateMonthAgo.getMonth() - 1);
      setData((prev) => ({ ...prev, dateMonthAgo: dateMonthAgo }));
    } else {
      setData((prev) => ({ ...prev, candidateInfo: {} as ICandidateInfo, registrarList: registrarsList }));
    }
  }

  async function handleOnOpening() {
    setIsLoading(false);
    setData(dataInitial);
    await loadRegistrars();
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
      const tx0 = api.tx.identity.setIdentity(dataState.candidateInfo);
      const options: Partial<SignerOptions> = {};
      const unsub = await signAndSendWithSubscribtion(tx0, pair, options, ({ events = [], status, txHash }) => {
        if (!status.isFinalized) {
          return;
        }
        events.forEach(({ phase, event: { data, method, section } }) => {
          if (method == "ExtrinsicSuccess") {
            const tx = api.tx.identity.requestJudgement(dataState.registrarData?.regIndex, dataState.registrarData?.fee.replace(re, ""));
            signAndSend(tx, pair, options);
          }
        });
        unsub();
      });
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
    registrarAccount = { ...registrarAccount, ...(registrarInfo as IPalletIdentityRegistrarInfo) };
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
        {!dataState.isRegistrar && !Boolean(pair.meta.isInjected) && (
          <>
            {!dataState.registrarData && <div>Please select a registrar:</div>}
            <Select2
              items={dataState.registrarList}
              itemPredicate={filterRegistrar}
              itemRenderer={renderRegistrar}
              noResults={<MenuItem disabled={true} text="No results." roleStructure="listoption" />}
              onItemSelect={setRegistrar}
              popoverProps={{ matchTargetWidth: true }}
              fill={true}
            >
              <Button
                text={dataState.registrarData?.account}
                rightIcon="double-caret-vertical"
                placeholder="Select a registrar"
                className={`${Classes.CONTEXT_MENU} ${Classes.FILL}`}
              />
            </Select2>
            {dataState.registrarData && (
              <>
                <InputGroup
                  disabled={isLoading}
                  large={true}
                  className="font-mono"
                  spellCheck={false}
                  placeholder="Enter display name"
                  onChange={(e) => {
                    let ci = dataState.candidateInfo;
                    ci.display = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.display || ""}
                />
                <InputGroup
                  disabled={isLoading}
                  large={true}
                  className="font-mono"
                  spellCheck={false}
                  placeholder="Enter legal name"
                  onChange={(e) => {
                    let ci = dataState.candidateInfo;
                    ci.legal = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.legal || ""}
                />
                <InputGroup
                  disabled={isLoading}
                  large={true}
                  className="font-mono"
                  spellCheck={false}
                  placeholder="Enter email"
                  onChange={(e) => {
                    let ci = dataState.candidateInfo;
                    ci.email = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.email || ""}
                />
                <InputGroup
                  disabled={isLoading}
                  large={true}
                  className="font-mono"
                  spellCheck={false}
                  placeholder="Enter web address"
                  onChange={(e) => {
                    let ci = dataState.candidateInfo;
                    ci.web = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.web || ""}
                />
                <InputGroup
                  disabled={isLoading}
                  large={true}
                  className="font-mono"
                  spellCheck={false}
                  placeholder="Enter twitter"
                  onChange={(e) => {
                    let ci = dataState.candidateInfo;
                    ci.twitter = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.twitter || ""}
                />
                <InputGroup
                  disabled={isLoading}
                  large={true}
                  className="font-mono"
                  spellCheck={false}
                  placeholder="Enter discord"
                  onChange={(e) => {
                    let ci = dataState.candidateInfo;
                    ci.discord = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.discord || ""}
                />
                <InputGroup
                  disabled={isLoading}
                  large={true}
                  className="font-mono"
                  spellCheck={false}
                  placeholder="Enter riot name"
                  onChange={(e) => {
                    let ci = dataState.candidateInfo;
                    ci.riot = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.riot || ""}
                />
                <Button
                  intent={Intent.PRIMARY}
                  disabled={isLoading || !canSubmit}
                  onClick={handleSubmitRequestForJudgement}
                  loading={isLoading}
                  text="Request for judgement"
                />
                <UserCard registrarInfo={dataState.registrarData} />
              </>
            )}
          </>
        )}
        {!dataState.isRegistrar && Boolean(pair.meta.isInjected) && <div>You already have identity</div>}
        {/* {dataState.isRegistrar && (
          <CandidateCards regIndex={dataState.registrarData?.regIndex || 1} pair={pair} dateMonthAgo={dataState.dateMonthAgo}/> */}
        {dataState.isRegistrar && dataState.registrarData?.regIndex && (
          <CandidateCards regIndex={dataState.registrarData?.regIndex} pair={pair} dateMonthAgo={dataState.dateMonthAgo} />
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}></div>
      </div>
    </Dialog>
  );
}
