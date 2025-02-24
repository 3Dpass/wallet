import { Button, Intent } from "@blueprintjs/core";
import keyring from "@polkadot/ui-keyring";
import { useAtomValue, useSetAtom } from "jotai/index";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiAdvancedModeAtom, poolIdsAtom } from "../../atoms";
import useToaster from "../../hooks/useToaster";
import { convertPool } from "../../utils/pool";
import { useAccounts, useApi } from "../Api";
import DialogCreateAddress from "../dialogs/DialogCreateAddress";
import DialogImportAddress from "../dialogs/DialogImportAddress";
import Account from "./Account.client";

export default function Wallet() {
  const { t } = useTranslation();
  const toaster = useToaster();

  const api = useApi();
  const accounts = useAccounts();
  const apiAdvancedMode = useAtomValue(apiAdvancedModeAtom);
  const setPoolIds = useSetAtom(poolIdsAtom);

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
        if (
          currentPairs.some(
            (keyringAddress) => keyringAddress.address === result.pair.address
          )
        ) {
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
    return (
      <div className="mb-4 w-100 h-[100px] border border-gray-500 border-dashed" />
    );
  }

  return (
    <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      <DialogImportAddress
        isOpen={dialogs.seed_phrase}
        showPassword={true}
        onClose={() => dialogToggle("seed_phrase")}
        onImport={handleSeedPhraseImportClick}
      />
      <DialogImportAddress
        isOpen={dialogs.json}
        showPassword={false}
        onClose={() => dialogToggle("json")}
        onImport={handleSeedPhraseImportClick}
      />
      <DialogCreateAddress
        isOpen={dialogs.create}
        onClose={() => dialogToggle("create")}
      />
      {accounts.map((pair) => {
        return (
          <div key={pair.address}>
            <Account pair={pair} />
          </div>
        );
      })}
      <div className="flex flex-col justify-center items-center">
        <div className="grid grid-cols-1 gap-1 w-full max-w-[600px]">
          <Button
            icon="new-object"
            text={t("root_wallet.lbl_btn_create_new_address")}
            onClick={() => dialogToggle("create")}
            large
            intent={accounts.length === 0 ? "primary" : "none"}
            fill
            className="h-[48px] text-lg"
          />
          <div className="grid grid-cols-2 gap-1">
            <Button
              icon="add"
              text={t("root_wallet.lbl_btn_import_from_seed")}
              onClick={() => dialogToggle("seed_phrase")}
              large
              fill
              className="h-[48px]"
            />
            <Button
              icon="import"
              text={t("root_wallet.lbl_btn_import_from_json")}
              onClick={() => dialogToggle("json")}
              large
              fill
              className="h-[48px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
