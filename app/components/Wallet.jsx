import { useEffect, useState } from "react";
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady, mnemonicGenerate } from "@polkadot/util-crypto";
import { walletMnemonic } from "../state";
import Identicon from "@polkadot/react-identicon";

import { useAtom } from "jotai";

const ss58format = {
  test: 72,
  live: 71,
};
const keyring = new Keyring({ type: "sr25519", ss58Format: ss58format.test });

export default function Wallet() {
  const [mnemonic, setMnemonic] = useAtom(walletMnemonic);
  const [pair, setPair] = useState(null);

  async function loadKeyringPairFromMnemonic(mnemonic) {
    await cryptoWaitReady();
    try {
      const pair = keyring.addFromMnemonic(mnemonic);
      setPair(pair);
    } catch (e) {
      console.log(e);
      generateRandomAddress();
    }
  }

  async function generateRandomAddress() {
    const newMnemonic = mnemonicGenerate();
    setMnemonic(newMnemonic);
    loadKeyringPairFromMnemonic(newMnemonic);
  }

  useEffect(() => {
    if (!mnemonic) {
      generateRandomAddress();
    } else {
      loadKeyringPairFromMnemonic(mnemonic);
    }
  }, [mnemonic]);

  if (!pair) {
    return <div>Loading wallet...</div>;
  }

  return (
    <div className="flex items-center">
      <div>
        <div>
          Address: <Identicon value={pair.address} size={18} theme="substrate" className="mr-1 mb-[-4px]" />
          <strong>{pair.address}</strong>
        </div>
        <input
          type="text"
          className="text-xs w-full border border-gray-500 mt-1"
          value={mnemonic}
          onChange={(e) => {
            setMnemonic(e.target.value);
          }}
        />
      </div>
      <a onClick={generateRandomAddress} className="ml-4">
        Generate address
      </a>
    </div>
  );
}
