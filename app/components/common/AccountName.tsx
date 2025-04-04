import { Icon, Intent } from "@blueprintjs/core";
import type { DeriveAccountRegistration } from "@polkadot/api-derive/types";
import { useEffect, useState } from "react";
import { useApi } from "../Api";

interface AccountNameProps {
  address: string;
  identity?: {
    display: string;
    parent?: string;
    isGood: boolean;
    isBad: boolean;
  };
  short?: boolean;
  noLink?: boolean;
}

export function extractIdentity(
  identity: DeriveAccountRegistration
): AccountNameProps["identity"] {
  const judgements = identity.judgements.filter(
    ([, judgement]) => !judgement.isFeePaid
  );
  const isGood = judgements.some(
    ([, judgement]) => judgement.isKnownGood || judgement.isReasonable
  );
  const isBad = judgements.some(
    ([, judgement]) => judgement.isErroneous || judgement.isLowQuality
  );

  const displayName = isGood
    ? identity.display || ""
    : (identity.display || "").replace(/[^\u0020-\u007E]/gu, "");

  const displayParent =
    identity.displayParent &&
    (isGood
      ? identity.displayParent
      : identity.displayParent.replace(/[^\u0020-\u007E]/gu, ""));

  return {
    display: displayName,
    parent: displayParent,
    isGood,
    isBad,
  };
}

export function AccountName({
  address,
  identity,
  short,
  noLink,
}: AccountNameProps) {
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

  const nameContent = (
    <div className="flex items-center gap-1.5 text-white overflow-hidden">
      <div className="flex-1">
        {localIdentity ? (
          <div
            className={`flex items-center gap-2 font-mono ${localIdentity.isGood ? "text-green-300" : localIdentity.isBad ? "text-red-300" : "text-yellow-300"}`}
          >
            {localIdentity.parent && (
              <>
                <span className="text-gray-300">{localIdentity.parent}</span>
                <span className="text-gray-300">/</span>
              </>
            )}
            <span
              className={`border-b leading-tight ${
                localIdentity.isGood
                  ? "border-b-green-300/50"
                  : localIdentity.isBad
                    ? "border-b-red-300/50"
                    : "border-b-yellow-300/50"
              } ${!noLink && "group-hover:border-b-current"}`}
            >
              {localIdentity.display}
            </span>
            {localIdentity.isGood && !localIdentity.isBad && (
              <Icon icon="endorsed" intent={Intent.SUCCESS} />
            )}
            {!localIdentity.isGood && !localIdentity.isBad && (
              <Icon icon="warning-sign" intent={Intent.WARNING} />
            )}
            <span className="font-mono opacity-50 -ml-2 [mask-image:linear-gradient(to_right,transparent_0%,white_25%,white_100%)]">
              {address.slice(-6)}
            </span>
          </div>
        ) : (
          <div className="inline-flex font-mono text-ellipsis overflow-hidden">
            {short ? (
              <span className="opacity-50 [mask-image:linear-gradient(to_right,transparent_0%,white_25%,white_100%)]">
                {address.slice(-12)}
              </span>
            ) : (
              <span
                className={`border-b border-b-gray-300/50 ${!noLink && "group-hover:border-b-current"} leading-tight`}
              >
                {address}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (noLink) {
    return nameContent;
  }

  return (
    <a
      href={`https://3dpscan.xyz/#/accounts/${address}`}
      className="no-underline group"
      target="_blank"
      rel="noreferrer"
    >
      {nameContent}
    </a>
  );
}
