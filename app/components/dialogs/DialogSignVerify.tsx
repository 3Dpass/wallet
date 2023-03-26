import { Button, Classes, Dialog, Icon, InputGroup, Intent, Label, TextArea } from "@blueprintjs/core";
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
  pastedData: string;
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
    pastedData: "",
    isSignatureValid: false,
    showValidationResults: false,
    publicKey: "",
    address: pair.address,
    messageType: DIALOG_SIGN,
    signedMessage: "",
    message: "",
  };
  const [data, setData] = useState<IData>(dataInitial);

  function handleOnOpening() {
    setData(dataInitial);
  }

  async function handleSignClick() {
    try {
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
    } catch (e: any) {
      toaster &&
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: e.message,
        });
    }
  }

  async function handleVerifyClick() {
    try {
      const messageRegex = /--\s*Start message\s*--\n?([\s\S]*?)\n?--\s*End message\s*--/g;
      const signatureRegex = /--\s*Start P3D wallet signature\s*--\n?([\s\S]*?)\n?--\s*End P3D wallet signature\s*--/g;
      const publicKeyRegex = /--\s*Start public key\s*--\n?([\s\S]*?)\n?--\s*End public key\s*--/g;

      const messageMatch = messageRegex.exec(data.pastedData);
      const signatureMatch = signatureRegex.exec(data.pastedData);
      const publicKeyMatch = publicKeyRegex.exec(data.pastedData);

      if (messageMatch && signatureMatch && publicKeyMatch) {
        const message = messageMatch[1].trim();
        const signedMessage = signatureMatch[1].trim();
        const publicKey = publicKeyMatch[1].trim();

        const signatureU8a = hexToU8a(signedMessage);
        const messageHash = blake2AsHex(message, 256);
        const publicKeyU8a = hexToU8a(publicKey);

        const isSigned = await signatureVerify(messageHash, signatureU8a, publicKeyU8a);

        setData((prevState) => ({
          ...prevState,
          isSignatureValid: isSigned.isValid,
          showValidationResults: true,
        }));
      }
    } catch (e: any) {
      toaster &&
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: e.message,
        });
    }
  }

  const inputMessage = `-- Start message --\n${data.message}\n-- End message --\n\n-- Start P3D wallet signature --\n${data.signedMessage}\n-- End P3D wallet signature --\n\n-- Start public key --\n${data.publicKey}\n-- End public key --`;
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
      pastedData: text,
    }));
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData((prevState) => ({
      ...prevState,
      message: e.target.value,
    }));
    void handleSignClick();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} onOpening={handleOnOpening} title="Sign and Verify Message" style={{ width: "550px" }}>
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-2`}>
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
                <TextArea className="font-mono h-80 w-full p-2 text-left" readOnly value={inputMessage} />
                <Button className="bp3-dark absolute bottom-2 right-2" onClick={handleCopyClick} text="Copy" />
              </div>
            </Label>
          </>
        )}
        {data.messageType === DIALOG_VERIFY && (
          <>
            <div className="relative">
              <TextArea
                className="bp4-code-block bp4-docs-code-block blueprint-dark h-80 w-full p-2 text-left"
                value={data.pastedData}
                onChange={(e) =>
                  setData((prevState) => ({
                    ...prevState,
                    pastedData: e.target.value,
                  }))
                }
              />
              <Button className="bp3-dark absolute bottom-2 right-2" onClick={handlePasteClick} text="Paste" />
            </div>
          </>
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        {data.messageType === DIALOG_SIGN && (
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={onClose} text="Cancel" />
            <Button intent={Intent.PRIMARY} onClick={handleSignClick} text="Sign" />
          </div>
        )}
        {data.messageType === DIALOG_VERIFY && (
          <>
            {data.showValidationResults && (
              <div className="flex justify-between items-center">
                {data.isSignatureValid && (
                  <>
                    <Icon icon="endorsed" intent={Intent.SUCCESS} />
                    <span className="pl-2 text-white font-bold">Verified!</span>
                  </>
                )}
                {!data.isSignatureValid && (
                  <>
                    <Icon icon="warning-sign" intent={Intent.DANGER} />
                    <span className="pl-2 text-white font-bold">Invalid signature</span>
                  </>
                )}
              </div>
            )}
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button onClick={onClose} text="Cancel" />
              <Button intent={Intent.PRIMARY} onClick={handleVerifyClick} text="Verify" />
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
