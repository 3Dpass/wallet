import { Button, Classes, Dialog, Icon, InputGroup, Intent } from "@blueprintjs/core";
import { cryptoWaitReady, blake2AsHex, signatureVerify, decodeAddress } from "@polkadot/util-crypto";
import type { KeyringPair } from "@polkadot/keyring/types";
import { web3FromSource } from "@polkadot/extension-dapp";
import { u8aToHex, hexToU8a } from "@polkadot/util";
import { keyring } from "@polkadot/ui-keyring";
import { toasterAtom } from "../../atoms";
import { useAtomValue } from "jotai";
import { useState } from "react";

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
  const [showFormattedMessage, setShowFormattedMessage] = useState(false);

  function handleOnOpening() {
    setMessage("");
    setSignedMessage("");
    setPublicKey("");
    setAddress(pair.address);
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
      const signatureU8a = hexToU8a(signedMessage);
      const publicKeyU8a = hexToU8a(publicKey);
      const messageHash = blake2AsHex(message, 256);

      const isSigned = await signatureVerify(messageHash, signatureU8a, publicKeyU8a);
      if (isSigned.isValid) {
        toaster &&
          toaster.show({
            icon: "endorsed",
            intent: Intent.SUCCESS,
            message: "Signature is valid",
          });
          setFormattedMessage(
            `-- Start message --\n${address} ${message}\n-- End message --\n\n-- Start P3D wallet signature --\n${signedMessage}\n-- End P3D wallet signature --`
          );
          setShowFormattedMessage(true);
      } else {
        toaster &&
          toaster.show({
            icon: "error",
            intent: Intent.DANGER,
            message: "Signature is invalid",
          });
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

  function copyFormattedMessage() {
    navigator.clipboard.writeText(formattedMessage).then(() => {
      toaster &&
        toaster.show({
          icon: "clipboard",
          intent: Intent.SUCCESS,
          message: "Formatted message copied",
        });
    });
  }

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        onOpening={handleOnOpening}
        title="Sign and Verify Message"
        style={{ width: "550px" }}
      >
        <div className={Classes.DIALOG_BODY}>
          <h6>Address</h6>
          <InputGroup
            large={true}
            className="mb-2"
            spellCheck={false}
            placeholder="Address"
            onChange={(e) => setAddress(e.target.value)}
            value={address}
            leftElement={<Icon icon="credit-card" />}
            disabled={true}
          />
          <h6>Message</h6>
          <InputGroup
            large={true}
            className="mb-2"
            spellCheck={false}
            placeholder="Message to sign"
            onChange={(e) => setMessage(e.target.value)}
            value={message}
            leftElement={<Icon icon="edit" />}
          />
          <h6>Signature key</h6>
          <InputGroup
            large={true}
            className="mb-2"
            spellCheck={false}
            placeholder="Signature"
            onChange={(e) => setSignedMessage(e.target.value)}
            value={signedMessage}
            leftElement={<Icon icon="key" />}
          />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={onClose} text="Cancel" />
            <Button intent={Intent.PRIMARY} onClick={handleSignClick} text="Sign" />
            <Button intent={Intent.PRIMARY} onClick={handleVerifyClick} text="Verify" />
          </div>
        </div>
      </Dialog>
      <Dialog
      isOpen={showFormattedMessage}
      onClose={() => setShowFormattedMessage(false)}
      title="Formatted Message"
      style={{ width: "550px" }}
    >
      <div className={Classes.DIALOG_BODY}>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            textAlign: 'center',
          }}
        >
          {formattedMessage}
        </pre>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={() => setShowFormattedMessage(false)} text="Close" />
          <Button intent={Intent.PRIMARY} onClick={copyFormattedMessage} text="Copy" />
        </div>
      </div>
    </Dialog>
  </>
);
}
