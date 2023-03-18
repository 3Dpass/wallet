import { cryptoWaitReady } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { useEffect, useState } from "react";
import { useSS58Format } from "../components/hooks";
import type { KeyringPair } from "@polkadot/keyring/types";
import { web3Accounts, web3Enable } from "@polkadot/extension-dapp";

export default function useAccounts(): { accounts: KeyringPair[]; isLoading: boolean } {
  const [isInitialized, setIsInitialized] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const ss58Format = useSS58Format();

  async function loadWeb3Accounts() {
    const extensions = await web3Enable("3dpass/wallet");
    if (extensions.length === 0) {
      return;
    }
    return await web3Accounts();
  }

  async function loadAllAccounts(ss58Format) {
    await cryptoWaitReady();
    const injected = await loadWeb3Accounts();
    keyring.loadAll({ ss58Format, type: "sr25519" }, injected);
  }

  useEffect(() => {
    if (isInitialized || !ss58Format) {
      return;
    }

    let subscription;

    loadAllAccounts(ss58Format).then(() => {
      subscription = keyring.accounts.subject.subscribe(() => {
        setAccounts(keyring.getPairs());
      });
      setIsInitialized(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [ss58Format]);

  return { accounts, isLoading: !setIsInitialized };
}
