import { Link } from "@remix-run/react";
import { AddressIcon } from "./AddressIcon";
import { useState, useEffect } from "react";
import { DeriveAccountRegistration } from "@polkadot/api-derive/types";
import { useApi } from "../Api";
import { Icon, Intent } from "@blueprintjs/core";

interface AccountNameProps {
  address: string;
  identity?: {
    display: string;
    parent?: string;
    isGood: boolean;
    isBad: boolean;
  };
}

export function extractIdentity(identity: DeriveAccountRegistration): AccountNameProps["identity"] {
  const judgements = identity.judgements.filter(([, judgement]) => !judgement.isFeePaid);
  const isGood = judgements.some(([, judgement]) => judgement.isKnownGood || judgement.isReasonable);
  const isBad = judgements.some(([, judgement]) => judgement.isErroneous || judgement.isLowQuality);

  const displayName = isGood ? identity.display || "" : (identity.display || "").replace(/[^\u0020-\u007E]/gu, "");

  const displayParent = identity.displayParent && (isGood ? identity.displayParent : identity.displayParent.replace(/[^\u0020-\u007E]/gu, ""));

  return {
    display: displayName,
    parent: displayParent,
    isGood,
    isBad,
  };
}

export function AccountName({ address, identity }: AccountNameProps) {
  const api = useApi();
  const [localIdentity, setLocalIdentity] = useState(identity);

  useEffect(() => {
    async function fetchIdentity() {
      if (!api || identity) return;

      try {
        const accountInfo = await api.derive.accounts.info(address);
        if (accountInfo.identity?.display) {
          setLocalIdentity(extractIdentity(accountInfo.identity));
        }
      } catch (error) {
        console.error("Error fetching identity:", error);
      }
    }

    fetchIdentity();
  }, [api, address, identity]);

  return (
    <Link to={`/address/${address}`} className="flex items-center gap-1 text-white no-underline group">
      <AddressIcon address={address} />
      <div className="flex-1">
        {localIdentity ? (
          <div
            className={`flex items-center gap-2 ${localIdentity.isGood ? "text-green-501" : localIdentity.isBad ? "text-red-500" : "text-yellow-500"}`}
          >
            {localIdentity.parent && (
              <>
                <span className="text-gray-601">{localIdentity.parent}</span>
                <span className="text-gray-601">/</span>
              </>
            )}
            <span className="border-b border-b-gray-501 group-hover:border-b-white">{localIdentity.display}</span>
            {localIdentity.isGood && !localIdentity.isBad && <Icon icon="endorsed" intent={Intent.SUCCESS} />}
            {!localIdentity.isGood && !localIdentity.isBad && <Icon icon="warning-sign" intent={Intent.WARNING} />}
          </div>
        ) : (
          <div className="inline-flex font-mono text-ellipsis overflow-hidden border-b border-b-gray-501 group-hover:border-b-white">{address}</div>
        )}
      </div>
    </Link>
  );
}
