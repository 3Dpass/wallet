import { Button, Classes, Dialog, InputGroup, Intent } from "@blueprintjs/core";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useState } from "react";

import type { SignerOptions } from "@polkadot/api/types";
import type { Codec } from "@polkadot/types/types";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import { signAndSend } from "../../utils/sign";
import { useApi } from "../Api";
import { FormattedAmount } from "../common/FormattedAmount";
import type { IPalletIdentityRegistrarInfo } from "../common/UserCard";
import UserCard from "../common/UserCard";
import { AddressSelect } from "../governance/AddressSelect";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
  hasIdentity: boolean;
  isRegistrar: boolean;
};

type ICandidateInfo = {
  display: string | null;
  legal: string | null;
  web: string | null;
  riot: string | null;
  email: string | null;
  discord: string | null;
  pgpFingerprint: string | null;
  image: string | null;
  twitter: string | null;
};

type IdentityInfo = {
  [key: string]: { Raw: string } | [[{ Raw: string }, { Raw: string }]];
};

type IIdentityData = {
  registrarList: IPalletIdentityRegistrarInfo[];
  registrarData: IPalletIdentityRegistrarInfo | null;
  identityData: IPalletIdentityRegistrarInfo | null;
  candidateInfo: ICandidateInfo;
  dateMonthAgo: Date | null;
};

export default function DialogIdentity({
  isOpen,
  onClose,
  pair,
  hasIdentity,
  isRegistrar,
}: IProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [isIdentityLoading, setIsIdentityLoading] = useState(false);
  const re = /,/gi;

  const dataInitial: IIdentityData = {
    registrarList: [],
    registrarData: null,
    identityData: null,
    candidateInfo: {} as ICandidateInfo,
    dateMonthAgo: null,
  };
  const [dataState, setData] = useState(dataInitial);

  async function loadRegistrars() {
    if (!api) {
      return;
    }
    const registrars: IPalletIdentityRegistrarInfo[] = (
      await api.query.identity.registrars()
    ).toHuman() as IPalletIdentityRegistrarInfo[];
    if (!registrars || !Array.isArray(registrars)) {
      return;
    }
    const registrarList: IPalletIdentityRegistrarInfo[] = [];
    let regIndexCurrent: number | null = null;
    let i = 0;
    for (const r of registrars) {
      registrarList.push({
        ...r,
        regIndex: i,
      });
      if (r.account === pair.address) {
        regIndexCurrent = i;
      }
      i++;
    }
    if (regIndexCurrent != null) {
      const dateMonthAgo = new Date();
      dateMonthAgo.setMonth(dateMonthAgo.getMonth() - 1);
      const registrarInfo = (
        await api.query.identity.identityOf(pair.address)
      ).toHuman() as IPalletIdentityRegistrarInfo;
      registrarInfo.regIndex = regIndexCurrent;
      setData((prev) => ({
        ...prev,
        registrarData: registrarInfo,
        dateMonthAgo: dateMonthAgo,
      }));
    } else if (hasIdentity) {
      const identityInfo = (
        await api.query.identity.identityOf(pair.address)
      ).toHuman();
      (identityInfo as IPalletIdentityRegistrarInfo).account = pair.address;
      setData((prev) => ({
        ...prev,
        identityData: identityInfo as IPalletIdentityRegistrarInfo,
      }));
    } else {
      const getIdentityPromiseList: Promise<Codec>[] = [];
      for (const r of registrars) {
        getIdentityPromiseList.push(api.query.identity.identityOf(r.account));
      }
      const results = await Promise.all(getIdentityPromiseList);
      for (const [i, r] of results.entries()) {
        registrarList[i] = {
          ...registrarList[i],
          ...(r.toHuman() as IPalletIdentityRegistrarInfo),
        };
      }
      setData((prev) => ({
        ...prev,
        candidateInfo: {} as ICandidateInfo,
        registrarList: registrarList,
      }));
    }
  }

  async function handleOnOpening() {
    setData(dataInitial);
    await loadRegistrars();
  }

  async function handleSubmitRequestForJudgement() {
    if (!api) {
      return;
    }
    setIsIdentityLoading(true);
    try {
      const candidateData = {} as IdentityInfo;
      for (const [key, value] of Object.entries(dataState.candidateInfo)) {
        if (value !== null) {
          if (key === "discord") {
            candidateData.additional = [[{ Raw: "Discord" }, { Raw: value }]];
          } else {
            candidateData[key] = { Raw: value };
          }
        }
      }
      const tx0 = api.tx.identity.setIdentity(candidateData);
      const options: Partial<SignerOptions> = {};
      const unsub = await signAndSend(
        tx0,
        pair,
        options,
        ({ events = [], status }) => {
          if (!status.isInBlock) {
            return;
          }
          for (const {
            event: { method },
          } of events) {
            if (method === "ExtrinsicSuccess") {
              const tx = api.tx.identity.requestJudgement(
                dataState.registrarData?.regIndex,
                dataState.registrarData?.fee.replace(re, "")
              );
              signAndSend(tx, pair, options, ({ status }) => {
                if (!status.isInBlock) {
                  return;
                }
                toaster.show({
                  icon: "endorsed",
                  intent: Intent.SUCCESS,
                  message: t("messages.lbl_judgement_requested"),
                });
                setIsIdentityLoading(false);
                onClose();
              });
            }
          }
          unsub();
        }
      );
      toaster.show({
        icon: "warning-sign",
        intent: Intent.WARNING,
        message: t("messages.lbl_working_on_request"),
        timeout: 20000,
      });
    } catch (e: unknown) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e instanceof Error ? e.message : "Unknown error occurred",
      });
      setIsIdentityLoading(false);
      onClose();
    }
  }

  async function setRegistrar(registrarAccount: IPalletIdentityRegistrarInfo) {
    if (!api) {
      return;
    }
    const registrarInfo = (
      await api.query.identity.identityOf(registrarAccount.account)
    ).toHuman();
    const updatedRegistrar = {
      ...registrarAccount,
      ...(registrarInfo as IPalletIdentityRegistrarInfo),
    };
    setData((prev) => ({ ...prev, registrarData: updatedRegistrar }));
  }

  function handleRegistrarSelect(account: string | null) {
    if (!account) return;
    const registrar = dataState.registrarList.find(
      (r) => r.account === account
    );
    if (registrar) {
      void setRegistrar(registrar);
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      usePortal
      onOpening={handleOnOpening}
      title={t("dlg_identity.lbl_title")}
      onClose={onClose}
      className="w-[90%] sm:w-[640px]"
    >
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        {!isRegistrar && !hasIdentity && (
          <>
            {!dataState.registrarData && (
              <div>{t("dlg_identity.lbl_select_registrar")}</div>
            )}
            <AddressSelect
              onAddressChange={handleRegistrarSelect}
              selectedAddress={dataState.registrarData?.account || ""}
              addresses={dataState.registrarList.map((r) => r.account)}
              isLoading={isIdentityLoading}
              metadata={Object.fromEntries(
                dataState.registrarList.map((registrar) => [
                  registrar.account,
                  <div
                    key={registrar.account}
                    className="flex items-center gap-2"
                  >
                    <span>
                      #{registrar.regIndex}: {registrar.info?.display?.Raw}
                    </span>
                    <FormattedAmount
                      value={Number.parseInt(
                        registrar.fee?.replace(re, "") || "0"
                      )}
                    />
                  </div>,
                ])
              )}
            />
            {dataState.registrarData && (
              <>
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder={t("dlg_identity.lbl_placeholder_display_name")}
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.display = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.display || ""}
                />
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder={t("dlg_identity.lbl_placeholder_legal_name")}
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.legal = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.legal || ""}
                />
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder={t("dlg_identity.lbl_placeholder_email")}
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.email = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.email || ""}
                />
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder={t("dlg_identity.lbl_placeholder_web_address")}
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.web = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.web || ""}
                />
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder={t("dlg_identity.lbl_placeholder_twitter")}
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.twitter = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.twitter || ""}
                />
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder={t("dlg_identity.lbl_placeholder_discord")}
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.discord = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.discord || ""}
                />
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder={t("dlg_identity.lbl_placeholder_riot_name")}
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.riot = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.riot || ""}
                />
                <Button
                  intent={Intent.PRIMARY}
                  disabled={isIdentityLoading || !api}
                  onClick={handleSubmitRequestForJudgement}
                  loading={isIdentityLoading}
                  text={t("dlg_identity.lbl_placeholder_request_judgement")}
                />
                <UserCard registrarInfo={dataState.registrarData} />
              </>
            )}
          </>
        )}
        {!isRegistrar && hasIdentity && dataState.identityData && (
          <UserCard registrarInfo={dataState.identityData} />
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS} />
      </div>
    </Dialog>
  );
}
