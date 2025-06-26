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
  phone: string | null;
  linkedin: string | null;
  telegram: string | null;
  github: string | null;
  custom: string | null;
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
  const [isCancelRequestLoading, setIsCancelRequestLoading] = useState(false);
  const [isClearIdentityLoading, setIsClearIdentityLoading] = useState(false);
  const re = /,/gi;
  const dataInitial: IIdentityData = {
    registrarList: [],
    registrarData: null,
    identityData: null,
    candidateInfo: {} as ICandidateInfo,
    dateMonthAgo: null,
  };
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const [dataState, setData] = useState(dataInitial);
  const [isLoadingRegistrars, setIsLoadingRegistrars] = useState(false);

  async function loadRegistrars() {
    setIsLoadingRegistrars(true);
    if (!api) {
      return;
    }
    // Fetch suspended registrar indices
    const suspendedIndicesRaw = await api.query.identity.suspendedRegistrars();
    // Convert to array of numbers (Vec<u32> -> number[])
    const suspendedIndices = (suspendedIndicesRaw.toJSON() as number[]) || [];

    const registrars: IPalletIdentityRegistrarInfo[] = (
      await api.query.identity.registrars()
    ).toHuman() as IPalletIdentityRegistrarInfo[];
    if (!registrars || !Array.isArray(registrars)) {
      setIsLoadingRegistrars(false);
      return;
    }
    const registrarList: IPalletIdentityRegistrarInfo[] = [];
    let regIndexCurrent: number | null = null;
    let i = 0;
    for (const r of registrars) {
      // Skip suspended registrars
      if (suspendedIndices.includes(i)) {
        i++;
        continue;
      }
      registrarList.push({
        ...r,
        regIndex: i,
      });
      i++;
    }
    if (hasIdentity) {
      // User has identity, try to pre-select their current registrar
      const identityInfo = (
        await api.query.identity.identityOf(pair.address)
      ).toHuman() as any;
      let registrarData: IPalletIdentityRegistrarInfo | null = null;
      if (identityInfo?.judgements && Array.isArray(identityInfo.judgements)) {
        // Find the first registrar with a judgement (if any)
        const firstJudgement = identityInfo.judgements.find((j: any) => Array.isArray(j) && typeof j[0] === 'number');
        if (firstJudgement) {
          const regIndex = firstJudgement[0];
          registrarData = registrarList.find(r => r.regIndex === regIndex) || null;
        }
      }
      setData((prev) => ({
        ...prev,
        registrarList,
        registrarData,
        identityData: identityInfo as IPalletIdentityRegistrarInfo,
      }));
    } else {
      setData((prev) => ({
        ...prev,
        candidateInfo: {} as ICandidateInfo,
        registrarList: registrarList,
      }));
    }
    setIsLoadingRegistrars(false);
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
      const additionalFields: [[{ Raw: string }, { Raw: string }]] = [] as any;
      for (const [key, value] of Object.entries(dataState.candidateInfo)) {
        if (value !== null) {
          if (key === "discord") {
            additionalFields.push([{ Raw: "Discord" }, { Raw: value }]);
          } else if (key === "phone") {
            additionalFields.push([{ Raw: "Phone" }, { Raw: value }]);
          } else if (key === "linkedin") {
            additionalFields.push([{ Raw: "LinkedIn" }, { Raw: value }]);
          } else if (key === "telegram") {
            additionalFields.push([{ Raw: "Telegram" }, { Raw: value }]);
          } else if (key === "github") {
            additionalFields.push([{ Raw: "Github" }, { Raw: value }]);
          } else if (key === "custom") {
            additionalFields.push([{ Raw: "Custom" }, { Raw: value }]);
          } else if (key === "pgpFingerprint") {
            (candidateData as any).pgpFingerprint = value;
          } else {
            candidateData[key] = { Raw: value };
          }
        }
      }
      if (additionalFields.length > 0) {
        candidateData.additional = additionalFields;
      }
      const txSetIdentity = api.tx.identity.setIdentity(candidateData);
      const txRequestJudgement = api.tx.identity.requestJudgement(
        dataState.registrarData?.regIndex,
        dataState.registrarData?.fee.replace(re, "")
      );
      const batchTx = api.tx.utility.batch([txSetIdentity, txRequestJudgement]);
      const options: Partial<SignerOptions> = {};
      const unsub = await signAndSend(
        batchTx,
        pair,
        options,
        ({ events = [], status }) => {
          if (!status.isInBlock) {
            return;
          }
          let success = false;
          for (const { event: { method, section } } of events) {
            if (section === "system" && method === "ExtrinsicSuccess") {
              success = true;
            }
            if (section === "system" && method === "ExtrinsicFailed") {
              success = false;
              break;
            }
          }
          if (success) {
            toaster.show({
              icon: "endorsed",
              intent: Intent.SUCCESS,
              message: t("messages.lbl_judgement_requested"),
            });
            setIsIdentityLoading(false);
            handleClose();
          } else {
            toaster.show({
              icon: "error",
              intent: Intent.DANGER,
              message: t("messages.lbl_working_on_request"),
            });
            setIsIdentityLoading(false);
            handleClose();
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
      handleClose();
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

  const handleClose = () => {
    setIsIdentityLoading(false);
    setIsCancelRequestLoading(false);
    setIsClearIdentityLoading(false);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      usePortal
      onOpening={handleOnOpening}
      title={t("dlg_identity.lbl_title")}
      onClose={handleClose}
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
                    <span className="flex items-right gap-2 pl-8">
                      #{registrar.regIndex} Fee:{registrar.info?.display?.Raw}
                    </span>
                    <FormattedAmount
                      value={Number.parseInt(registrar.fee?.replace(re, "") || "0")}
                      unit="P3D"
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
                  minimal
                  small
                  icon={showAdditionalFields ? "chevron-up" : "chevron-down"}
                  onClick={() => setShowAdditionalFields(!showAdditionalFields)}
                  text={showAdditionalFields ? "Hide additional fields" : "Show additional fields"}
                />
                {showAdditionalFields && (
                  <>
                    <InputGroup
                      disabled={isIdentityLoading}
                      large
                      className="font-mono"
                      spellCheck={false}
                      placeholder="Phone number"
                      onChange={(e) => {
                        const ci = dataState.candidateInfo;
                        ci.phone = e.target.value;
                        setData((prev) => ({ ...prev, candidateInfo: ci }));
                      }}
                      value={dataState.candidateInfo.phone || ""}
                    />
                    <InputGroup
                      disabled={isIdentityLoading}
                      large
                      className="font-mono"
                      spellCheck={false}
                      placeholder="LinkedIn"
                      onChange={(e) => {
                        const ci = dataState.candidateInfo;
                        ci.linkedin = e.target.value;
                        setData((prev) => ({ ...prev, candidateInfo: ci }));
                      }}
                      value={dataState.candidateInfo.linkedin || ""}
                    />
                    <InputGroup
                      disabled={isIdentityLoading}
                      large
                      className="font-mono"
                      spellCheck={false}
                      placeholder="Telegram"
                      onChange={(e) => {
                        const ci = dataState.candidateInfo;
                        ci.telegram = e.target.value;
                        setData((prev) => ({ ...prev, candidateInfo: ci }));
                      }}
                      value={dataState.candidateInfo.telegram || ""}
                    />
                    <InputGroup
                      disabled={isIdentityLoading}
                      large
                      className="font-mono"
                      spellCheck={false}
                      placeholder="Github"
                      onChange={(e) => {
                        const ci = dataState.candidateInfo;
                        ci.github = e.target.value;
                        setData((prev) => ({ ...prev, candidateInfo: ci }));
                      }}
                      value={dataState.candidateInfo.github || ""}
                    />
                    <InputGroup
                      disabled={isIdentityLoading}
                      large
                      className="font-mono"
                      spellCheck={false}
                      placeholder="Custom"
                      onChange={(e) => {
                        const ci = dataState.candidateInfo;
                        ci.custom = e.target.value;
                        setData((prev) => ({ ...prev, candidateInfo: ci }));
                      }}
                      value={dataState.candidateInfo.custom || ""}
                    />
                    <InputGroup
                      disabled={isIdentityLoading}
                      large
                      className="font-mono"
                      spellCheck={false}
                      placeholder="PGP Fingerprint (20 bytes hex)"
                      onChange={(e) => {
                        const ci = dataState.candidateInfo;
                        ci.pgpFingerprint = e.target.value;
                        setData((prev) => ({ ...prev, candidateInfo: ci }));
                      }}
                      value={dataState.candidateInfo.pgpFingerprint || ""}
                    />
                  </>
                )}
                <Button
                  intent={Intent.PRIMARY}
                  disabled={isIdentityLoading || !api}
                  onClick={handleSubmitRequestForJudgement}
                  loading={isIdentityLoading}
                  text={t("dlg_identity.lbl_placeholder_request_judgement")}
                />
              </>
            )}
          </>
        )}
        {!isRegistrar && hasIdentity && dataState.identityData && !showUpdateForm && (
          (function() {
            // Only check for FeePaid status for Cancel Request button
            let showCancelRequest = false;
            let registrarIndex = null;
            if (dataState.identityData && Array.isArray(dataState.identityData.judgements)) {
              for (const [regIdx, judgement] of dataState.identityData.judgements) {
                // regIdx can be string or number
                const idx = typeof regIdx === 'string' ? parseInt(regIdx) : regIdx;
                if (judgement && typeof judgement === 'object' && 'FeePaid' in judgement) {
                  showCancelRequest = true;
                  registrarIndex = idx;
                }
              }
            }
            // Always show UserCard if hasIdentity is true
            return <>
              <UserCard registrarInfo={dataState.identityData} />
              <Button
                intent={Intent.PRIMARY}
                className="mt-4"
                onClick={() => {
                  if (!dataState.registrarData) {
                    let registrarData = null;
                    if (dataState.identityData && Array.isArray(dataState.identityData.judgements)) {
                      const firstJudgement = dataState.identityData.judgements.find((j) => Array.isArray(j));
                      if (firstJudgement) {
                        const regIdx = firstJudgement[0];
                        const regIndex = typeof regIdx === 'string' ? parseInt(regIdx) : regIdx;
                        registrarData = dataState.registrarList.find(r => r.regIndex === regIndex) || null;
                      }
                    }
                    if (!registrarData && dataState.registrarList.length > 0) {
                      registrarData = dataState.registrarList[0];
                    }
                    setData(prev => ({ ...prev, registrarData }));
                  }
                  setShowUpdateForm(true);
                }}
              >
                {t("Update")}
              </Button>
              {showCancelRequest && (
                <Button
                  intent={Intent.DANGER}
                  className="mt-2"
                  onClick={async () => {
                    if (!api || registrarIndex === null) return;
                    setIsCancelRequestLoading(true);
                    try {
                      const tx = api.tx.identity.cancelRequest(registrarIndex);
                      await signAndSend(tx, pair);
                      toaster.show({
                        icon: "trash",
                        intent: Intent.SUCCESS,
                        message: t("Request cancelled!"),
                      });
                      setIsCancelRequestLoading(false);
                      handleClose();
                    } catch (e) {
                      toaster.show({
                        icon: "error",
                        intent: Intent.DANGER,
                        message: e instanceof Error ? e.message : String(e),
                      });
                      setIsCancelRequestLoading(false);
                    }
                  }}
                  loading={isCancelRequestLoading}
                >
                  {t("Cancel Request")}
                </Button>
              )}
              <Button
                intent={Intent.DANGER}
                className="mt-2"
                onClick={async () => {
                  if (!api) return;
                  setIsClearIdentityLoading(true);
                  try {
                    const tx = api.tx.identity.clearIdentity();
                    await signAndSend(tx, pair);
                    toaster.show({
                      icon: "trash",
                      intent: Intent.SUCCESS,
                      message: t("Identity clear request sent!"),
                    });
                    setIsClearIdentityLoading(false);
                    handleClose();
                  } catch (e) {
                    toaster.show({
                      icon: "error",
                      intent: Intent.DANGER,
                      message: e instanceof Error ? e.message : String(e),
                    });
                    setIsClearIdentityLoading(false);
                  }
                }}
                loading={isClearIdentityLoading}
              >
                {t("Clear")}
              </Button>
            </>;
          })()
        )}
        {!isRegistrar && hasIdentity && dataState.identityData && showUpdateForm && (
          <>
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
                    <span className="flex items-right gap-2 pl-8">
                      #{registrar.regIndex} Fee:{registrar.info?.display?.Raw}
                    </span>
                    <FormattedAmount
                      value={Number.parseInt(registrar.fee?.replace(re, "") || "0")}
                      unit="P3D"
                    />
                  </div>,
                ])
              )}
            />
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
              minimal
              small
              icon={showAdditionalFields ? "chevron-up" : "chevron-down"}
              onClick={() => setShowAdditionalFields(!showAdditionalFields)}
              text={showAdditionalFields ? "Hide additional fields" : "Show additional fields"}
            />
            {showAdditionalFields && (
              <>
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder="Phone number"
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.phone = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.phone || ""}
                />
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder="LinkedIn"
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.linkedin = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.linkedin || ""}
                />
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder="Telegram"
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.telegram = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.telegram || ""}
                />
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder="Github"
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.github = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.github || ""}
                />
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder="Custom"
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.custom = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.custom || ""}
                />
                <InputGroup
                  disabled={isIdentityLoading}
                  large
                  className="font-mono"
                  spellCheck={false}
                  placeholder="PGP Fingerprint (20 bytes hex)"
                  onChange={(e) => {
                    const ci = dataState.candidateInfo;
                    ci.pgpFingerprint = e.target.value;
                    setData((prev) => ({ ...prev, candidateInfo: ci }));
                  }}
                  value={dataState.candidateInfo.pgpFingerprint || ""}
                />
              </>
            )}
            <Button
              intent={Intent.PRIMARY}
              disabled={isIdentityLoading || !api}
              onClick={handleSubmitRequestForJudgement}
              loading={isIdentityLoading}
              text={t("dlg_identity.lbl_placeholder_request_judgement")}
            />
            <Button
              className="mt-2"
              onClick={() => {
                setShowUpdateForm(false);
                // Clear registrar data when canceling update
                setData(prev => ({
                  ...prev,
                  registrarData: null
                }));
              }}
            >
              {t("Cancel")}
            </Button>
          </>
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS} />
      </div>
      {(function() {
        const r = dataState.registrarData;
        // Check for all required fields
        const isValid = r && typeof r === 'object' && r.account && r.info && r.regIndex !== undefined;
        if (isValid) {
          try {
            return (
              <div className="mt-4">
                <UserCard registrarInfo={r} />
              </div>
            );
          } catch (e) {
            return <div className="mt-4 text-red-500">Failed to render registrar card.</div>;
          }
        } else if (!isLoadingRegistrars && dataState.registrarList.length === 0) {
          return <div className="mt-4 text-red-500">No available registrar to display.</div>;
        } else {
          return null;
        }
      })()}
    </Dialog>
  );
}
