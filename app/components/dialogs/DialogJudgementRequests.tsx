import { Dialog, Classes, Button, Intent, Spinner, InputGroup } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../Api";
import UserCard, { IPalletIdentityRegistrarInfo } from "../common/UserCard";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { AnyJson } from "@polkadot/types/types";
import useToaster from "../../hooks/useToaster";
import { signAndSend } from "../../utils/sign";
import { FormattedAmount } from "../common/FormattedAmount";

interface DialogJudgementRequestsProps {
  isOpen: boolean;
  onClose: () => void;
  registrarPair: KeyringPair;
}

interface Identity {
  judgements: [string | number, { [key: string]: unknown }][];
  info?: {
    display?: { Raw: string };
    legal?: { Raw: string };
    email?: { Raw: string };
    web?: { Raw: string };
    twitter?: { Raw: string };
    riot?: { Raw: string };
    additional?: { Raw: string }[][];
  };
}

interface IdentityWithAddress {
  address: string;
  identity: Identity;
}

interface Registrar {
  account: string;
  [key: string]: unknown;
}

export default function DialogJudgementRequests({ isOpen, onClose, registrarPair }: DialogJudgementRequestsProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);
  const [identities, setIdentities] = useState<IdentityWithAddress[]>([]);
  const [submitting, setSubmitting] = useState<{ [key: string]: "provide" | "reject" | null }>({});
  const [search, setSearch] = useState("");
  const [registrarIndex, setRegistrarIndex] = useState<number | null>(null);
  const [judgementLevels, setJudgementLevels] = useState<{ [address: string]: string }>({});

  const judgementOptions = [
    "Unknown",
    "Reasonable",
    "KnownGood",
    "Erroneous",
    "LowQuality",
    "OutOfDate"
  ];

  const handleJudgementChange = (address: string, value: string) => {
    setJudgementLevels((prev) => ({ ...prev, [address]: value }));
  };

  useEffect(() => {
    if (!isOpen || !api || !registrarPair) return;
    setLoading(true);
    (async () => {
      // Fetch all registrars and find the index for the current registrar
      const registrars = (await api.query.identity.registrars()).toHuman() as Registrar[];
      let index = null;
      if (Array.isArray(registrars)) {
        for (let i = 0; i < registrars.length; i++) {
          if (registrars[i]?.account === registrarPair.address) {
            index = i;
            break;
          }
        }
      }
      setRegistrarIndex(index);
      // Fetch all identities
      const entries = await api.query.identity.identityOf.entries();
      const pending = entries
        .map(([storageKey, identityOpt]) => {
          const address = storageKey.args[0]?.toString();
          const identity = identityOpt.toHuman() as unknown as Identity;
          if (!identity) return null;
          // Defensive: judgements may be undefined or not an array
          if (!Array.isArray(identity.judgements)) return null;
          // Find a FeePaid judgement for this registrar's index
          const hasRequest = identity.judgements.some(([regIdx, judgement]) => {
            // Convert both to string for comparison
            if (regIdx == null || typeof regIdx === "object") return false;
            if (parseInt(regIdx.toString()) !== index) return false;
            // Check if judgement is an object with FeePaid
            return judgement && typeof judgement === "object" && "FeePaid" in judgement;
          });
          return hasRequest ? { address, identity } : null;
        })
        .filter((item): item is IdentityWithAddress => item !== null);
      setIdentities(pending);
      setLoading(false);
    })();
  }, [isOpen, api, registrarPair]);

  const handleSubmitJudgement = async (address: string) => {
    if (!api || registrarIndex === null) {
      toaster.show({ intent: "danger", message: t("Registrar index not found or API unavailable.") });
      return;
    }
    const judgement = judgementLevels[address] || "Reasonable";
    setSubmitting((prev) => ({ ...prev, [address]: "provide" }));
    try {
      const tx = api.tx.identity.provideJudgement(registrarIndex, address, judgement);
      await signAndSend(tx, registrarPair, {}, ({ status, isError }) => {
        if (isError) {
          setSubmitting((prev) => ({ ...prev, [address]: null }));
          return;
        }

        if (status.isInBlock) {
          toaster.show({ intent: "success", message: t("Judgement submitted!") });
          setSubmitting((prev) => ({ ...prev, [address]: null }));
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toaster.show({
        intent: "danger",
        message: t("dlg_judgement_requests.msg_error", {
          error: message,
        }),
      });
      setSubmitting((prev) => ({ ...prev, [address]: null }));
    }
  };

  // Filter identities by search
  const filteredIdentities = identities.filter(({ address, identity }) => {
    const query = search.toLowerCase();
    if (address.toLowerCase().includes(query)) return true;
    if (identity && typeof identity === "object") {
      // Check display name and other fields
      const info = identity.info;
      if (info?.display?.Raw?.toLowerCase().includes(query)) return true;
      if (info?.legal?.Raw?.toLowerCase().includes(query)) return true;
      if (info?.email?.Raw?.toLowerCase().includes(query)) return true;
      if (info?.web?.Raw?.toLowerCase().includes(query)) return true;
      if (info?.twitter?.Raw?.toLowerCase().includes(query)) return true;
      if (info?.riot?.Raw?.toLowerCase().includes(query)) return true;
    }
    return false;
  });

  const convertToRegistrarInfo = (address: string, identity: Identity): IPalletIdentityRegistrarInfo => {
    return {
      account: address,
      fee: "0",
      fields: [],
      regIndex: 0,
      info: {
        display: { Raw: identity.info?.display?.Raw || "" },
        email: { Raw: identity.info?.email?.Raw || "" },
        web: { Raw: identity.info?.web?.Raw || "" },
        twitter: { Raw: identity.info?.twitter?.Raw || "" },
        image: { Raw: "" },
        additional: (identity.info?.additional || []).map(
          (item) => [item?.[0] || { Raw: '' }, item?.[1] || { Raw: '' }]
        )
      },
      judgements: identity.judgements.map(([regIdx, judgement]) => [regIdx.toString(), judgement]) as object[][]
    };
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t("root.lbl_judgements_requests") || "Judgement requests"} className="w-[90%] sm:w-[732px]">
      <div className={Classes.DIALOG_BODY}>
        <InputGroup
          leftIcon="search"
          placeholder={t("Search by address, name, email...")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4"
        />
        {loading ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredIdentities.length === 0 && <div>{t("No pending requests")}</div>}
            {filteredIdentities.map(({ address, identity }) => (
              <div key={address} className="p-2 rounded">
                <UserCard registrarInfo={convertToRegistrarInfo(address, identity)} />
                <div className="flex gap-2 mt-2 items-center">
                  <select
                    className="border rounded px-4 py-2 text-base h-10"
                    style={{ minWidth: 160 }}
                    value={judgementLevels[address] || "Reasonable"}
                    onChange={e => handleJudgementChange(address, e.target.value)}
                  >
                    {judgementOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <Button
                    intent={Intent.PRIMARY}
                    large
                    style={{ minWidth: 120, height: 40, fontSize: 16 }}
                    loading={submitting[address] === "provide"}
                    onClick={() => handleSubmitJudgement(address)}
                  >
                    {t("Provide")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose}>{t("commons.lbl_btn_close")}</Button>
        </div>
      </div>
    </Dialog>
  );
} 