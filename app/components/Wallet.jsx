import { useEffect, useState } from "react";
import { cryptoWaitReady, mnemonicGenerate } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import Identicon from "@polkadot/react-identicon";
import { useAtomValue } from "jotai";
import { polkadotApi } from "../state";

const ss58format = {
  test: 72,
  live: 71,
};

export default function Wallet() {
  const [isLoading, setIsLoading] = useState(true);
  const api = useAtomValue(polkadotApi);
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});

  function generateAddress() {
    const mnemonic = mnemonicGenerate();
    keyring.addUri(mnemonic);
  }

  function forgetAddress(address) {
    keyring.forgetAccount(address);
  }

  useEffect(() => {
    let sub;
    cryptoWaitReady().then(() => {
      keyring.loadAll({ ss58Format: ss58format.test, type: "sr25519" });
      sub = keyring.accounts.subject.subscribe(() => {
        setAccounts(keyring.getAccounts());
      });
      const accounts = keyring.getAccounts();
      if (accounts.length === 0) {
        generateAddress();
      }
      setIsLoading(false);
    });

    return () => {
      sub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!api) {
      return;
    }
    accounts.forEach((account) => {
      const { nonce, data: balance } = api.query.system.account(account.address);
      setBalances((prevBalances) => ({ ...prevBalances, [account.address]: { nonce, balance } }));
    });
  }, [api, accounts]);

  if (isLoading) {
    return <div>Loading wallet...</div>;
  }

  return (
    <div className="flex items-center">
      <div>
        {accounts.map((account) => {
          return (
            <div key={account.address}>
              <Identicon value={account.address} size={18} theme="substrate" className="mr-1 mb-[-4px]" />
              <strong>{account.address}</strong>
              {balances[account.address] && <span className="ml-1">{balances[account.address].balance ?? "N/A"} 3dp</span>}
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
