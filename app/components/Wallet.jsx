import { useEffect, useState } from "react";
import { cryptoWaitReady, mnemonicGenerate } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import Identicon from "@polkadot/react-identicon";

const ss58format = {
  test: 72,
  live: 71,
};

export default function Wallet() {
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);

  function generateAddress() {
    const mnemonic = mnemonicGenerate();
    keyring.addUri(mnemonic);
    setAccounts(keyring.getAccounts());
  }

  function forgetAddress(address) {
    keyring.forgetAccount(address);
    setAccounts(keyring.getAccounts());
    return false;
  }

  useEffect(() => {
    cryptoWaitReady().then(() => {
      keyring.loadAll({ ss58Format: ss58format.test, type: "sr25519" });
      const accounts = keyring.getAccounts();
      if (accounts.length === 0) {
        generateAddress();
      } else {
        setAccounts(accounts);
      }
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <div>Loading wallet...</div>;
  }

  return (
    <div className="flex items-center">
      <div>
        {accounts.map((account) => {
          return (
            <div>
              Address: <Identicon value={account.address} size={18} theme="substrate" className="mr-1 mb-[-4px]" />
              <strong>{account.address}</strong>
              <a
                onClick={() => {
                  forgetAddress(account.address);
                }}
                className="ml-1"
              >
                &times;
              </a>
            </div>
          );
        })}
      </div>
      <a onClick={generateAddress} className="ml-4">
        Generate address
      </a>
    </div>
  );
}
