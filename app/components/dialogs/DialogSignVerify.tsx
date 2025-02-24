import {
  Button,
  Icon,
  type IconName,
  InputGroup,
  Intent,
  Label,
  Radio,
  RadioGroup,
  TextArea,
} from "@blueprintjs/core";
import { web3FromSource } from "@polkadot/extension-dapp";
import type { KeyringPair } from "@polkadot/keyring/types";
import { keyring } from "@polkadot/ui-keyring";
import { u8aToHex } from "@polkadot/util";
import { signatureVerify } from "@polkadot/util-crypto";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import BaseDialog from "./BaseDialog";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

const DIALOG_SIGN = "sign";
const DIALOG_VERIFY = "verify";
type DialogType = typeof DIALOG_SIGN | typeof DIALOG_VERIFY;

type IData = {
  isSignatureValid: boolean;
  showValidationResults: boolean;
  publicKey: string;
  address: string;
  messageType: DialogType;
  signedMessage: string;
  message: string;
  messageToVerify: string;
};

export default function DialogSignAndVerify({ pair, isOpen, onClose }: IProps) {
  const { t } = useTranslation();
  const toaster = useToaster();
  const dataInitial: IData = {
    isSignatureValid: false,
    showValidationResults: false,
    publicKey: "",
    address: pair.address,
    messageType: DIALOG_SIGN,
    message: "",
    messageToVerify: "",
    signedMessage: "",
  };
  const [data, setData] = useState<IData>(dataInitial);
  const signatureTemplate = `-- Start message --\n${data.message}\n-- End message --\n\n-- Start P3D wallet signature --\n${data.signedMessage}\n-- End P3D wallet signature --\n\n-- Start public key --\n${data.publicKey}\n-- End public key --`;
  const canCopyToClipboard: boolean =
    navigator.clipboard?.writeText !== undefined;
  const canPasteFromClipboard: boolean =
    navigator.clipboard?.readText !== undefined;

  function handleOnOpening() {
    setData(dataInitial);
  }

  function handleCopyClick() {
    navigator.clipboard.writeText(signatureTemplate).then(() => {
      toaster.show({
        message: t("messages.lbl_message_copied"),
        intent: Intent.SUCCESS,
        icon: "tick",
      });
    });
  }

  function handleMessageChange(event: React.ChangeEvent<HTMLInputElement>) {
    setData((prevState) => ({
      ...prevState,
      message: event.target.value,
    }));
  }

  async function sign() {
    let signature: string;
    if (pair.meta.isInjected) {
      const injected = await web3FromSource(pair.meta.source as string);
      const signer = injected.signer;
      if (!signer.signRaw) {
        throw new Error(t("messages.lbl_raw_messages_not_supported"));
      }
      const signed = await signer.signRaw({
        address: pair.address,
        data: data.message,
        type: "bytes",
      });
      signature = signed.signature;
    } else {
      const signer = keyring.getPair(data.address);
      signature = u8aToHex(await signer.sign(data.message));
    }

    setData((prevState) => ({
      ...prevState,
      signedMessage: signature,
      publicKey: pair.address,
    }));
  }

  async function handleSignClick() {
    try {
      await sign();
    } catch (e: unknown) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  async function verify(messageToVerify: string) {
    if (data.messageType !== DIALOG_VERIFY || !messageToVerify.trim()) {
      return;
    }

    const messageRegex = /-- Start message --\n(.*)\n-- End message --/g;
    const signatureRegex =
      /-- Start P3D wallet signature --\n(.*)\n-- End P3D wallet signature --/g;
    const publicKeyRegex =
      /-- Start public key --\n(.*)\n-- End public key --/g;

    const messageMatch = messageRegex.exec(messageToVerify);
    const signatureMatch = signatureRegex.exec(messageToVerify);
    const publicKeyMatch = publicKeyRegex.exec(messageToVerify);

    let isValid = false;

    if (messageMatch && signatureMatch && publicKeyMatch) {
      const message = messageMatch[1].trim();
      const signature = signatureMatch[1].trim();
      const publicKey = publicKeyMatch[1].trim();

      try {
        const verification = await signatureVerify(
          message,
          signature,
          publicKey
        );
        isValid = verification.isValid;
      } catch (e: unknown) {
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    setData((prevState) => ({
      ...prevState,
      isSignatureValid: isValid,
      showValidationResults: true,
    }));
  }

  function setMessageAndVerify(message: string) {
    setData((prevState) => ({
      ...prevState,
      showValidationResults: false,
      messageToVerify: message,
    }));
    try {
      void verify(message);
    } catch (e: unknown) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  async function handlePasteClick() {
    const text = await navigator.clipboard.readText();
    setMessageAndVerify(text);
  }

  function handleVerifyMessageChange(
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) {
    const text = event.target.value;
    setMessageAndVerify(text);
  }

  // Custom footer content for the verification mode
  const verificationFooterContent = data.messageType === DIALOG_VERIFY && (
    <div className="text-lg">
      {data.showValidationResults && data.isSignatureValid && (
        <div className="flex items-center gap-2">
          <Icon icon="endorsed" intent={Intent.SUCCESS} />
          {t("dlg_sign_verify.lbl_verified")}
        </div>
      )}
      {data.showValidationResults && !data.isSignatureValid && (
        <div className="flex items-center gap-2">
          <Icon icon="warning-sign" intent={Intent.DANGER} />
          {t("dlg_sign_verify.lbl_invalid_signature")}
        </div>
      )}
    </div>
  );

  // Configure dialog buttons based on the current mode
  const dialogButtons = {
    primaryButton:
      data.messageType === DIALOG_SIGN
        ? {
            intent: Intent.PRIMARY,
            onClick: handleSignClick,
            icon: "edit" as IconName,
            text: t("dlg_sign_verify.lbl_btn_sign"),
          }
        : undefined,
    cancelButtonText:
      data.messageType === DIALOG_SIGN
        ? t("commons.lbl_btn_cancel")
        : t("commons.lbl_btn_close"),
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      onOpening={handleOnOpening}
      title={t("dlg_sign_verify.lbl_title")}
      className="w-[550px]"
      footerContent={verificationFooterContent}
      {...dialogButtons}
    >
      <div className="flex justify-center mt-2 text-lg">
        <RadioGroup
          inline
          onChange={(event: React.FormEvent<HTMLInputElement>) => {
            const inputElement = event.target as HTMLInputElement;
            setData((prevState) => ({
              ...prevState,
              messageType: inputElement.value as DialogType,
            }));
          }}
          selectedValue={data.messageType}
        >
          <Radio label={t("dlg_sign_verify.lbl_rd_sign")} value={DIALOG_SIGN} />
          <Radio
            label={t("dlg_sign_verify.lbl_rd_verify")}
            value={DIALOG_VERIFY}
          />
        </RadioGroup>
      </div>
      {data.messageType === DIALOG_SIGN && (
        <>
          <Label>
            {t("dlg_sign_verify.lbl_placeholder_message")}
            <InputGroup
              large
              spellCheck={false}
              placeholder={t("dlg_sign_verify.lbl_placeholder_message")}
              onChange={handleMessageChange}
              value={data.message}
              leftElement={<Icon icon="edit" />}
              disabled={false}
            />
          </Label>
          <Label>
            {t("dlg_sign_verify.lbl_signed_message")}
            <div className="relative">
              <TextArea
                className="font-mono h-80 w-full p-2 text-left"
                value={signatureTemplate}
              />
              {canCopyToClipboard && (
                <Button
                  className="bp3-dark absolute bottom-2 right-2"
                  onClick={handleCopyClick}
                  text={t("commons.lbl_btn_copy")}
                />
              )}
            </div>
          </Label>
        </>
      )}
      {data.messageType === DIALOG_VERIFY && (
        <div className="relative">
          <TextArea
            className="font-mono h-80 w-full p-2 text-left"
            value={data.messageToVerify}
            onChange={handleVerifyMessageChange}
          />
          {canPasteFromClipboard && (
            <Button
              className="bp3-dark absolute bottom-2 right-2"
              onClick={handlePasteClick}
              text={t("commons.lbl_btn_paste")}
            />
          )}
        </div>
      )}
    </BaseDialog>
  );
}
