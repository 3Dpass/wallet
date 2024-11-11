import { Link } from "@remix-run/react";
import { AddressIcon } from "./AddressIcon";
import { useState, useEffect } from "react";
import { DeriveAccountRegistration } from "@polkadot/api-derive/types";
import { useApi } from "../Api";

interface AccountNameProps {
  address: string;
  identity?: {
    display: string;
    parent?: string;
    isGood: boolean;
    isBad: boolean;
  };
}

export function extractIdentity(identity: DeriveAccountRegistration): AccountNameProps['identity'] {
  const judgements = identity.judgements.filter(([, judgement]) => !judgement.isFeePaid);
  const isGood = judgements.some(([, judgement]) => judgement.isKnownGood || judgement.isReasonable);
  const isBad = judgements.some(([, judgement]) => judgement.isErroneous || judgement.isLowQuality);
  
  const displayName = isGood
    ? (identity.display || '')
    : (identity.display || '').replace(/[^\x20-\x7E]/g, '');
  
  const displayParent = identity.displayParent && (
    isGood
      ? identity.displayParent
      : identity.displayParent.replace(/[^\x20-\x7E]/g, '')
  );

  return {
    display: displayName,
    parent: displayParent,
    isGood,
    isBad
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

    void fetchIdentity();
  }, [api, address, identity]);

  return (
    <Link to={`/address/${address}`} className="flex items-center text-white no-underline group">
      <AddressIcon address={address} />
      <div className="ml-3">
        {localIdentity ? (
          <div className={`${localIdentity.isGood ? 'text-green-501' : localIdentity.isBad ? 'text-red-500' : 'text-gray-500'}`}>
            {localIdentity.parent && (
              <span className="text-gray-601">{localIdentity.parent}/</span>
            )}
            <span className="border-b border-b-gray-501 group-hover:border-b-white">
              {localIdentity.display}
            </span>
            {localIdentity.isGood && !localIdentity.isBad && (
              <span className="ml-2">✓</span>
            )}
          </div>
        ) : (
          <div className="font-mono text-ellipsis overflow-hidden border-b border-b-gray-501 group-hover:border-b-white">
            {address}
          </div>
        )}
      </div>
    </Link>
  );
} 