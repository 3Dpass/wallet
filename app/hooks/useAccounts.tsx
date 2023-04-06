import { cryptoWaitReady } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { useEffect, useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";
import { web3Accounts, web3Enable } from "@polkadot/extension-dapp";
import { useSS58Format } from "./useSS58Format";
import { genesisHashes, NETWORK_MAINNET, NETWORK_TEST } from "../api.config";
import useIsMainnet from "./useIsMainnet";

export default function useAccounts(): { accounts: KeyringPair[]; isLoading: boolean } {
  const [isInitialized, setIsInitialized] = useState(false);
  const [accounts, setAccounts] = useState<KeyringPair[]>([]);
  const ss58Format = useSS58Format();
  const isMainnet = useIsMainnet();

  async function loadWeb3Accounts(ss58Format: any) {
    const extensions = await web3Enable("3dpass/wallet");
    if (extensions.length === 0) {
      return;
    }
    const genesisHash = genesisHashes[isMainnet ? NETWORK_MAINNET : NETWORK_TEST];
    return await web3Accounts({ genesisHash, ss58Format });
  }

  useEffect(() => {
    if (isInitialized || !ss58Format) {
      return;
    }

    async function loadAllAccounts(ss58Format: any) {
      await cryptoWaitReady();
      const injected = await loadWeb3Accounts(ss58Format);
      keyring.loadAll({ ss58Format, type: "sr25519" }, injected);
    }

    let subscription: any;

    loadAllAccounts(ss58Format).then(() => {
      subscription = keyring.accounts.subject.subscribe(() => {
        setAccounts(keyring.getPairs());
      });
      setIsInitialized(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isInitialized, ss58Format]);

  return { accounts, isLoading: !setIsInitialized };
}
