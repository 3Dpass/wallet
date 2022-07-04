import { useEffect, useState } from "react";
import { Keyring } from "@polkadot/keyring";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { walletMnemonic } from "../state";
import { useAtom } from "jotai";

const ss58format = {
  test: 72,
  live: 71,
};
const keyring = new Keyring({ type: "sr25519", ss58Format: ss58format.test });

export default function Wallet() {
  const [mnemonic, setMnemonic] = useAtom(walletMnemonic);
  const [pair, setPair] = useState(null);

  function generateRandomAddress() {
    const newMnemonic = mnemonicGenerate();
    setMnemonic(newMnemonic);
    loadKeyringPairFromMnemonic(newMnemonic);
  }

  function loadKeyringPairFromMnemonic(mnemonic) {
    setPair(keyring.addFromMnemonic(mnemonic, {}, "ed25519"));
  }

  useEffect(() => {
    if (!mnemonic) {
      generateRandomAddress();
    } else {
      loadKeyringPairFromMnemonic(mnemonic);
    }
  }, []);

  if (!pair) {
    return <div>Loading wallet...</div>;
  }

  return (
    <div className="flex items-center">
      <div>
        Address: <strong>{pair.address}</strong>
        <div className="text-xs">{mnemonic}</div>
      </div>
      <a onClick={generateRandomAddress} className="ml-4">
        Generate address
      </a>
    </div>
  );
}
