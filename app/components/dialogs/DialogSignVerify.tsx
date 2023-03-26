import { Button, Classes, Dialog, Icon, InputGroup, Intent, Label, Radio, RadioGroup, TextArea } from "@blueprintjs/core";
import { blake2AsHex, decodeAddress, signatureVerify } from "@polkadot/util-crypto";
import type { KeyringPair } from "@polkadot/keyring/types";
import { web3FromSource } from "@polkadot/extension-dapp";
import { hexToU8a, u8aToHex } from "@polkadot/util";
import { keyring } from "@polkadot/ui-keyring";
import { toasterAtom } from "../../atoms";
import { useAtomValue } from "jotai";
import React, { useState } from "react";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

const DIALOG_SIGN = "sign";
const DIALOG_VERIFY = "verify";

type IData = {
  messageToVerify: string;
  isSignatureValid: boolean;
  showValidationResults: boolean;
  publicKey: string;
  address: string;
  messageType: "sign" | "verify";
  signedMessage: string;
  message: string;
};

export default function DialogSignAndVerify({ pair, isOpen, onClose }: IProps) {
  const toaster = useAtomValue(toasterAtom);
  const dataInitial: IData = {
    messageToVerify: "",
    isSignatureValid: false,
    showValidationResults: false,
    publicKey: "",
    address: pair.address,
    messageType: DIALOG_SIGN,
    signedMessage: "",
    message: "",
  };
  const [data, setData] = useState<IData>(dataInitial);
  const inputMessage = `-- Start message --\n${data.message}\n-- End message --\n\n-- Start P3D wallet signature --\n${data.signedMessage}\n-- End P3D wallet signature --\n\n-- Start public key --\n${data.publicKey}\n-- End public key --`;

  function handleOnOpening() {
    setData(dataInitial);
  }

  const handleCopyClick = () => {
    navigator.clipboard.writeText(inputMessage).then(() => {
      toaster &&
        toaster.show({
          message: "Message copied to clipboard!",
          intent: Intent.SUCCESS,
          icon: "tick",
        });
    });
  };

  const handlePasteClick = async () => {
    const text = await navigator.clipboard.readText();
    setData((prevState) => ({
      ...prevState,
      messageToVerify: text,
    }));
  };

  const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setData((prevState) => ({
      ...prevState,
      message: event.target.value,
    }));
  };

  async function sign() {
    let signer;
    if (pair.meta.isInjected) {
      const injected = await web3FromSource(pair.meta.source as string);
      signer = injected.signer;
    } else {
      signer = keyring.getPair(data.address);
    }

    const messageHash = blake2AsHex(data.message, 256);

    let signature;
    if (pair.meta.isInjected) {
      const { signature: sig } = await signer.signRaw({
        address: pair.address,
        data: u8aToHex(hexToU8a(messageHash)),
        type: "bytes",
      });
      signature = hexToU8a(sig);
    } else {
      signature = await signer.sign(messageHash);
    }

    let publicKey: Uint8Array;
    if (pair.meta.isInjected) {
      publicKey = decodeAddress(pair.address);
    } else {
      publicKey = signer.publicKey;
    }

    const signatureU8a = new Uint8Array(signature);
    setData((prevState) => ({
      ...prevState,
      signedMessage: u8aToHex(signatureU8a),
      publicKey: u8aToHex(publicKey),
    }));
  }

  async function handleSignClick() {
    try {
      await sign();
    } catch (e: any) {
      toaster &&
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: e.message,
        });
    }
  }

  async function verify() {
    const messageRegex = /--\s*Start message\s*--\n?([\s\S]*?)\n?--\s*End message\s*--/g;
    const signatureRegex = /--\s*Start P3D wallet signature\s*--\n?([\s\S]*?)\n?--\s*End P3D wallet signature\s*--/g;
    const publicKeyRegex = /--\s*Start public key\s*--\n?([\s\S]*?)\n?--\s*End public key\s*--/g;

    const messageMatch = messageRegex.exec(data.messageToVerify);
    const signatureMatch = signatureRegex.exec(data.messageToVerify);
    const publicKeyMatch = publicKeyRegex.exec(data.messageToVerify);

    let isValid = false;

    if (messageMatch && signatureMatch && publicKeyMatch) {
      const message = messageMatch[1].trim();
      const signedMessage = signatureMatch[1].trim();
      const publicKey = publicKeyMatch[1].trim();

      const signatureU8a = hexToU8a(signedMessage);
      const messageHash = blake2AsHex(message, 256);
      const publicKeyU8a = hexToU8a(publicKey);

      const signature = await signatureVerify(messageHash, signatureU8a, publicKeyU8a);
      isValid = signature.isValid;
    }

    setData((prevState) => ({
      ...prevState,
      isSignatureValid: isValid,
      showValidationResults: true,
    }));
  }

  async function handleVerifyMessageChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setData((prevState) => ({
      ...prevState,
      messageToVerify: event.target.value,
      showValidationResults: false,
    }));
    try {
      await verify();
    } catch (e: any) {
      toaster &&
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: e.message,
        });
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} onOpening={handleOnOpening} title="Sign and Verify Message" style={{ width: "550px" }}>
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-2`}>
        <div className="flex justify-center mt-2 text-lg">
          <RadioGroup
            inline
            onChange={(event: React.FormEvent<HTMLInputElement>) =>
              setData((prevState) => ({
                ...prevState,
                messageType: event.target.value,
              }))
            }
            selectedValue={data.messageType}
          >
            <Radio label="Sign" value={DIALOG_SIGN} />
            <Radio label="Verify" value={DIALOG_VERIFY} />
          </RadioGroup>
        </div>
        {data.messageType === DIALOG_SIGN && (
          <>
            <Label>
              Message
              <InputGroup
                large={true}
                spellCheck={false}
                placeholder="Message"
                onChange={handleMessageChange}
                value={data.message}
                leftElement={<Icon icon="edit" />}
                disabled={false}
              />
            </Label>
            <Label>
              Signed message
              <div className="relative">
                <TextArea className="font-mono h-80 w-full p-2 text-left" value={inputMessage} />
                <Button className="bp3-dark absolute bottom-2 right-2" onClick={handleCopyClick} text="Copy" />
              </div>
            </Label>
          </>
        )}
        {data.messageType === DIALOG_VERIFY && (
          <>
            <div className="relative">
              <TextArea className="font-mono h-80 w-full p-2 text-left" value={data.messageToVerify} onChange={handleVerifyMessageChange} />
              <Button className="bp3-dark absolute bottom-2 right-2" onClick={handlePasteClick} text="Paste" />
            </div>
          </>
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        {data.messageType === DIALOG_SIGN && (
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={onClose} text="Cancel" />
            <Button icon="edit" intent={Intent.PRIMARY} onClick={handleSignClick} text="Sign" />
          </div>
        )}
        {data.messageType === DIALOG_VERIFY && (
          <>
            <div className={`${Classes.DIALOG_FOOTER_ACTIONS} flex justify-between`}>
              <div className="text-lg">
                {data.showValidationResults && data.isSignatureValid && (
                  <div className="flex items-center gap-2">
                    <Icon icon="endorsed" intent={Intent.SUCCESS} />
                    Verified!
                  </div>
                )}
                {data.showValidationResults && !data.isSignatureValid && (
                  <div className="flex items-center gap-2">
                    <Icon icon="warning-sign" intent={Intent.DANGER} />
                    Invalid signature
                  </div>
                )}
              </div>
              <Button onClick={onClose} text="Close" />
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
