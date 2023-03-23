import { Button, Classes, Dialog, Icon, InputGroup, Intent, RadioGroup, Radio, TextArea } from "@blueprintjs/core";
import { cryptoWaitReady, blake2AsHex, signatureVerify, decodeAddress } from "@polkadot/util-crypto";
import type { KeyringPair } from "@polkadot/keyring/types";
import { web3FromSource } from "@polkadot/extension-dapp";
import { u8aToHex, hexToU8a } from "@polkadot/util";
import { keyring } from "@polkadot/ui-keyring";
import { toasterAtom } from "../../atoms";
import { useAtomValue } from "jotai";
import { useState, useRef } from "react";

type IProps = {
  pair: KeyringPair;
  isOpen: boolean;
  onClose: () => void;
};

export default function DialogSignAndVerify({ pair, isOpen, onClose }: IProps) {
  const toaster = useAtomValue(toasterAtom);
  const [message, setMessage] = useState("");
  const [signedMessage, setSignedMessage] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [address, setAddress] = useState("");
  const [formattedMessage, setFormattedMessage] = useState("");
  const [messageType, setMessageType] = useState("sign");
  const [pastedData, setPastedData] = useState("");
  const [isSignatureValid, setIsSignatureValid] = useState(false);

  function handleOnOpening() {
    setMessage("");
    setSignedMessage("");
    setPublicKey("");
    setAddress(pair.address);
    setMessageType("sign");
  }

  async function handleSignClick() {
    try {
      await cryptoWaitReady();

      let signer;
      if (pair.meta.isInjected) {
        const injected = await web3FromSource(pair.meta.source);
        signer = injected.signer;
      } else {
        signer = keyring.getPair(address);
      }

      const messageHash = blake2AsHex(message, 256);

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

      let publicKey;
      if (pair.meta.isInjected) {
        publicKey = decodeAddress(pair.address);
      } else {
        publicKey = signer.publicKey;
      }

      const signatureU8a = new Uint8Array(signature);
      setSignedMessage(u8aToHex(signatureU8a));
      setPublicKey(u8aToHex(publicKey));
    } catch (e) {
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
      if (messageType === "verify") {
        // Extract message and signedMessage from pastedData
        const messageRegex = /--\s*Start message\s*--\n?([\s\S]*?)\n?--\s*End message\s*--/g;
        const signatureRegex = /--\s*Start P3D wallet signature\s*--\n?([\s\S]*?)\n?--\s*End P3D wallet signature\s*--/g;
        const publicKeyRegex = /--\s*Start public key\s*--\n?([\s\S]*?)\n?--\s*End public key\s*--/g;

        const messageMatch = messageRegex.exec(pastedData);
        const signatureMatch = signatureRegex.exec(pastedData);
        const publicKeyMatch = publicKeyRegex.exec(pastedData);

        if (messageMatch && signatureMatch && publicKeyMatch) {
          const message = messageMatch[1].trim();
          const signedMessage = signatureMatch[1].trim();
          const publicKey = publicKeyMatch[1].trim();
          console.log("message: ", message);
          console.log("signedMessage: ", signedMessage);
          console.log("publicKey: ", publicKey);

          // Convert hex signatures to U8a
          const signatureU8a = hexToU8a(signedMessage);
          const messageHash = blake2AsHex(message, 256);
          const publicKeyU8a = hexToU8a(publicKey);

          // Call the verification function with extracted data
          const isSigned = await signatureVerify(messageHash, signatureU8a, publicKeyU8a);

          if (isSigned.isValid) {
            setIsSignatureValid(true);
            toaster &&
              toaster.show({
                icon: "endorsed",
                intent: Intent.SUCCESS,
                message: "Signature is valid",
              });
          } else {
            setIsSignatureValid(false);
            toaster &&
              toaster.show({
                icon: "error",
                intent: Intent.DANGER,
                message: "Signature is invalid",
              });
          }
        } else {
          console.error("Unable to extract message and signature from pasted data");
        }
      }
    } catch (e) {
      toaster &&
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: e.message,
        });
    }
  }
  const handleCopyClick = () => {
    const messageToCopy =
      setFormattedMessage &&
      `-- Start message --\n ${message}\n-- End message --\n\n-- Start P3D wallet signature --\n${signedMessage}\n-- End P3D wallet signature --\n\n-- Start public key --\n${publicKey}\n-- End public key --`;

    navigator.clipboard.writeText(messageToCopy).then(() => {
      toaster.show({
        message: "Message copied to clipboard!",
        intent: Intent.SUCCESS,
        icon: "tick",
      });
    });
  };
  const textareaRef = useRef();
  const handlePasteClick = async () => {
    if (messageType === "verify") {
      try {
        const text = await navigator.clipboard.readText();
        setPastedData(text);
        console.log("Pasted text:", text);
      } catch (err) {
        console.error("Failed to paste content: ", err);
      }
    }
  };

  return (
    <>
      <Dialog isOpen={isOpen} onClose={onClose} onOpening={handleOnOpening} title="Sign and Verify Message" style={{ width: "550px" }}>
        <div className={Classes.DIALOG_BODY}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <RadioGroup inline onChange={(e) => setMessageType(e.currentTarget.value)} selectedValue={messageType}>
              <Radio label="Sign" value="sign" />
              <Radio label="Verify" value="verify" />
            </RadioGroup>
          </div>
          {messageType === "sign" && (
            <>
              <h6>Address</h6>
              <InputGroup
                large={true}
                className="mb-2"
                spellCheck={false}
                placeholder="Address"
                onChange={(e) => setAddress(e.target.value)}
                value={address}
                leftElement={<Icon icon="credit-card" />}
                disabled={false}
              />
            </>
          )}
          <h6>Message</h6>
          {messageType === "sign" ? (
            <>
              <InputGroup
                large={true}
                className="mb-2"
                spellCheck={false}
                placeholder="Message"
                onChange={(e) => setMessage(e.target.value)}
                value={message}
                leftElement={<Icon icon="edit" />}
                disabled={false}
              />
              <h6>Signed message</h6>
              <div style={{ position: "relative" }}>
                <TextArea
                  className="bp4-code-block bp4-docs-code-block blueprint-dark"
                  style={{
                    height: "220px",
                    width: "100%",
                    padding: "10px",
                    textAlign: "left",
                  }}
                  readOnly
                  value={
                    setFormattedMessage &&
                    `-- Start message --\n ${message}\n-- End message --\n\n-- Start P3D wallet signature --\n${signedMessage}\n-- End P3D wallet signature --\n\n-- Start public key --\n${publicKey}\n-- End public key --`
                  }
                />
                <Button
                  className="bp3-dark"
                  onClick={handleCopyClick}
                  text="Copy"
                  style={{
                    position: "absolute",
                    bottom: "5px",
                    right: "25px",
                  }}
                />
              </div>
              <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                  <Button onClick={onClose} text="Cancel" />
                  <Button intent={Intent.PRIMARY} onClick={handleSignClick} text="Sign" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ position: "relative" }}>
                <TextArea
                  className="bp4-code-block bp4-docs-code-block blueprint-dark"
                  style={{
                    height: "220px",
                    width: "100%",
                    padding: "10px",
                    textAlign: "left",
                  }}
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                />

                <Button
                  className="bp3-dark"
                  onClick={handlePasteClick}
                  text="Paste"
                  style={{
                    position: "absolute",
                    bottom: "5px",
                    right: "22px",
                  }}
                />
              </div>
              <div className={Classes.DIALOG_FOOTER}>
                <div className={`${Classes.DIALOG_FOOTER_ACTIONS} footer-actions`}>
                  <div>
                    {isSignatureValid && messageType === "verify" && (
                      <>
                        <Icon className="verified-icon" icon="endorsed" intent={Intent.SUCCESS} />
                        <span className="verified-text">Verified!</span>
                      </>
                    )}
                  </div>
                  <div>
                    <Button onClick={onClose} text="Cancel" />
                    <Button intent={Intent.PRIMARY} onClick={handleVerifyClick} text="Verify" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </>
  );
}
