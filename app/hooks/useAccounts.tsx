import { cryptoWaitReady } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { useEffect, useState } from "react";
import { useSS58Format } from "../components/hooks";
import type { KeyringPair } from "@polkadot/keyring/types";

export default function useAccounts(): { accounts: KeyringPair[]; isLoading: boolean } {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const ss58format = useSS58Format();

  useEffect(() => {
    if (!ss58format) {
      return;
    }

    let subscription;

    cryptoWaitReady().then(() => {
      try {
        keyring.loadAll({ ss58Format: ss58format, type: "sr25519" });
      } catch (e) {
        if (e.message == "Unable to initialise options more than once") {
          window.location.reload();
        }
        throw e;
      }
      subscription = keyring.accounts.subject.subscribe(() => {
        setAccounts(keyring.getPairs());
      });
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [ss58format]);

  return { accounts, isLoading };
}
