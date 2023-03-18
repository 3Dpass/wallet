import { useCallback, useState } from "react";
import keyring from "@polkadot/ui-keyring";
import { Button, Card, Elevation, Intent } from "@blueprintjs/core";
import { useAtomValue } from "jotai";
import { apiAtom, toasterAtom } from "../../atoms";
import DialogImportAddress from "../dialogs/DialogImportAddress";
import DialogCreateAddress from "../dialogs/DialogCreateAddress";
import Account from "./Account.client";
import useAccounts from "../../hooks/useAccounts";

export default function Wallet() {
  const api = useAtomValue(apiAtom);
  const toaster = useAtomValue(toasterAtom);
  const { accounts, isLoading } = useAccounts();

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
      const currentPairs = keyring.getPairs();
      const result = keyring.addUri(seed_phrase, password);

      if (currentPairs.some((keyringAddress) => keyringAddress.address === result.pair.address)) {
        throw new Error(`Wallet already imported`);
      }

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

  if (isLoading || !api) {
    return <div className="mb-4 w-100 h-[100px] border border-gray-500 border-dashed"></div>;
  }

  return (
    <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      <DialogImportAddress
        isOpen={dialogs.seed_phrase}
        showPassword={true}
        onClose={() => dialogToggle("seed_phrase")}
        onImport={handleSeedPhraseImportClick}
      />
      <DialogImportAddress isOpen={dialogs.json} showPassword={false} onClose={() => dialogToggle("json")} onImport={handleJSONWalletImportClick} />
      <DialogCreateAddress isOpen={dialogs.create} onClose={() => dialogToggle("create")} />
      {accounts.map((pair) => {
        return <Account key={pair.address} pair={pair} />;
      })}
      <Card className="grid gap-1" elevation={Elevation.ZERO}>
        <Button icon="new-object" text="Create new address..." onClick={() => dialogToggle("create")} />
        <Button icon="add" text="Import from seed phrase..." onClick={() => dialogToggle("seed_phrase")} />
        <Button icon="import" text="Import from JSON..." onClick={() => dialogToggle("json")} />
      </Card>
    </div>
  );
}
