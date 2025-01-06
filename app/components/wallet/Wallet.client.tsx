import { useCallback, useEffect, useState } from "react";
import keyring from "@polkadot/ui-keyring";
import { Button, Intent } from "@blueprintjs/core";
import DialogImportAddress from "../dialogs/DialogImportAddress";
import DialogCreateAddress from "../dialogs/DialogCreateAddress";
import Account from "./Account.client";
import useToaster from "../../hooks/useToaster";
import { useAccounts, useApi } from "../Api";
import { useAtom, useAtomValue, useSetAtom } from "jotai/index";
import { apiAdvancedModeAtom, lastSelectedAccountAtom, poolIdsAtom } from "../../atoms";
import { convertPool } from "../../utils/pool";
import { useTranslation } from "react-i18next";

export default function Wallet() {
  const { t } = useTranslation();
  const toaster = useToaster();

  const api = useApi();
  const accounts = useAccounts();
  const apiAdvancedMode = useAtomValue(apiAdvancedModeAtom);
  const setPoolIds = useSetAtom(poolIdsAtom);
  const [selectedAccount, setSelectedAccount] = useAtom(lastSelectedAccountAtom);

  const dialogsInitial = {
    seed_phrase: false,
    json: false,
    create: false,
  };
  const [dialogs, setDialogs] = useState(dialogsInitial);
  const dialogToggle = useCallback((name: keyof typeof dialogsInitial) => {
    setDialogs((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].address);
    }
  }, [accounts, selectedAccount, setSelectedAccount]);

  useEffect(() => {
    if (apiAdvancedMode) {
      api?.query.miningPool.pools.entries().then((pools) => {
        const poolsIds = convertPool(Array.from(pools));
        setPoolIds(poolsIds.poolIds);
      });
    }
  }, [api, apiAdvancedMode, setPoolIds]);

  const handleSeedPhraseImportClick = useCallback(
    (seed_phrase: string, password: string) => {
      try {
        const currentPairs = keyring.getPairs();
        const result = keyring.addUri(seed_phrase, password);
        if (currentPairs.some((keyringAddress) => keyringAddress.address === result.pair.address)) {
          toaster.show({
            icon: "warning-sign",
            intent: Intent.WARNING,
            message: t("wallet.msg_address_already_exists"),
          });
          return;
        }
        toaster.show({
          icon: "tick",
          intent: Intent.SUCCESS,
          message: t("wallet.msg_address_imported"),
        });
      } catch (e) {
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: t("wallet.msg_invalid_seed_phrase"),
        });
      }
    },
    [t, toaster]
  );

  if (!api) {
    return <div className="mb-4 w-100 h-[100px] border border-gray-500 border-dashed" />;
  }

  return (
    <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
      <DialogImportAddress
        isOpen={dialogs.seed_phrase}
        showPassword={true}
        onClose={() => dialogToggle("seed_phrase")}
        onImport={handleSeedPhraseImportClick}
      />
      <DialogImportAddress isOpen={dialogs.json} showPassword={false} onClose={() => dialogToggle("json")} onImport={handleSeedPhraseImportClick} />
      <DialogCreateAddress isOpen={dialogs.create} onClose={() => dialogToggle("create")} />
      {accounts.map((pair) => {
        return (
          <div
            key={pair.address}
            className={pair.address === selectedAccount ? "border border-blue-500 rounded" : undefined}
            onClick={() => setSelectedAccount(pair.address)}
          >
            <Account pair={pair} />
          </div>
        );
      })}
      <div className="grid gap-1">
        <Button icon="new-object" text={t("root_wallet.lbl_btn_create_new_address")} onClick={() => dialogToggle("create")} />
        <Button icon="add" text={t("root_wallet.lbl_btn_import_from_seed")} onClick={() => dialogToggle("seed_phrase")} />
        <Button icon="import" text={t("root_wallet.lbl_btn_import_from_json")} onClick={() => dialogToggle("json")} />
      </div>
    </div>
  );
}
