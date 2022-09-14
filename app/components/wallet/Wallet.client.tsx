import { useCallback, useEffect, useState } from "react";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import keyring from "@polkadot/ui-keyring";
import { Button, Card, Intent } from "@blueprintjs/core";
import { useAtomValue } from "jotai";
import { apiAtom, toasterAtom } from "../../atoms";
import DialogImportAddress from "../dialogs/DialogImportAddress";
import DialogCreateAddress from "../dialogs/DialogCreateAddress";
import Account from "./Account.client";
import { useSS58Format } from "../hooks";

export default function Wallet() {
  const api = useAtomValue(apiAtom);
  const toaster = useAtomValue(toasterAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [pairs, setPairs] = useState([]);
  const ss58format = useSS58Format();

  const dialogsInitial = {
    seed_phrase: false,
    json: false,
    create: false,
  };
  const [dialogs, setDialogs] = useState(dialogsInitial);
  const dialogToggle = useCallback((name: keyof typeof dialogsInitial) => {
    setDialogs((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  function handleSeedPhraseImportClick(seed_phrase, password) {
    try {
      keyring.addUri(seed_phrase, password);
      dialogToggle("seed_phrase");
    } catch (e) {
      toaster &&
        toaster.show({
          icon: "ban-circle",
          intent: Intent.DANGER,
          message: e.message,
        });
    }
  }

  function handleJSONWalletImportClick(json) {
    try {
      const pair = keyring.createFromJson(JSON.parse(json));
      keyring.addPair(pair, "");
      dialogToggle("json");
    } catch (e) {
      toaster &&
        toaster.show({
          icon: "ban-circle",
          intent: Intent.DANGER,
          message: e.message,
        });
    }
  }

  useEffect(() => {
    if (!ss58format) {
      return;
    }
    let sub;
    cryptoWaitReady().then(() => {
      try {
        keyring.loadAll({ ss58Format: ss58format, type: "sr25519" });
      } catch (e) {
        if (e.message == "Unable to initialise options more than once") {
          window.location.reload();
        } else {
          toaster &&
            toaster.show({
              icon: "ban-circle",
              intent: Intent.DANGER,
              message: e.message,
            });
        }
      }
      sub = keyring.accounts.subject.subscribe(() => {
        setPairs(keyring.getPairs());
      });
      setIsLoading(false);
    });

    return () => {
      sub.unsubscribe();
    };
  }, [ss58format]);

  if (isLoading || !api) {
    return <div className="mb-4 w-100 h-[100px] animate-pulse bg-gray-600"></div>;
  }

  return (
    <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
      <DialogImportAddress
        isOpen={dialogs.seed_phrase}
        showPassword={true}
        onClose={() => dialogToggle("seed_phrase")}
        onImport={handleSeedPhraseImportClick}
      />
      <DialogImportAddress isOpen={dialogs.json} showPassword={false} onClose={() => dialogToggle("json")} onImport={handleJSONWalletImportClick} />
      <DialogCreateAddress isOpen={dialogs.create} onClose={() => dialogToggle("create")} />
      {pairs.map((pair) => {
        return <Account key={pair.address} pair={pair} />;
      })}
      <Card className="grid gap-1">
        <Button icon="new-object" text="Create new address..." onClick={() => dialogToggle("create")} />
        <Button icon="add" text="Import from seed phrase..." onClick={() => dialogToggle("seed_phrase")} />
        <Button icon="import" text="Import from JSON..." onClick={() => dialogToggle("json")} />
      </Card>
    </div>
  );
}
