import React, { useEffect, useState, useCallback, useRef } from "react";
import BaseDialog from "./BaseDialog";
import { useApi } from "app/components/Api";
import { FormattedAmount } from "app/components/common/FormattedAmount";
import { AccountName } from "app/components/common/AccountName";
import { Spinner, HTMLTable, InputGroup } from "@blueprintjs/core";
import TokenHoldersPieChart from "./TokenHoldersPieChart";

interface DialogAssetDistributionProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number;
  decimals: number;
  symbol: string;
}

type Holder = {
  accountId: string;
  balance: number;
  identityName: string | null;
};

// Type for Polkadot Option objects
type PolkadotOption = {
  isSome: boolean;
  unwrap: () => { toJSON: () => Record<string, unknown> };
  toHuman?: () => Record<string, unknown>;
  toJSON?: () => Record<string, unknown>;
};

function isOption(obj: unknown): obj is PolkadotOption {
  if (!obj || typeof obj !== 'object') return false;
  const option = obj as Record<string, unknown>;
  return typeof option.isSome === "boolean" && typeof option.unwrap === "function";
}

export default function DialogAssetDistribution({ isOpen, onClose, assetId, decimals, symbol }: DialogAssetDistributionProps) {
  const api = useApi();
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [search, setSearch] = useState("");
  const mountedRef = useRef(true);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    mountedRef.current = true;
    async function fetchHolders() {
      setLoading(true);
      setError(null);
      try {
        if (!api) throw new Error("API not ready");
        // Query all accounts for this asset
        const entries = await api.query.poscanAssets.account.entries(assetId);
        let list = entries.map(([storageKey, opt]) => {
          const accountId = storageKey.args[1]?.toString();
          const data = opt.toHuman ? opt.toHuman() : (isOption(opt) ? opt.unwrap().toJSON() : opt.toJSON());
          const balanceData = typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
          return {
            accountId,
            balance: Number(balanceData?.balance?.toString().replace(/,/g, "")) || 0,
            identityName: null as string | null,
          };
        }).filter(h => h.balance > 0);
        // Fetch identities in parallel
        const identities = await Promise.all(
          list.map(async (h) => {
            try {
              const info = await api.derive.accounts.info(h.accountId);
              return info.identity?.display || null;
            } catch {
              return null;
            }
          })
        );
        list = list.map((h, i) => ({ ...h, identityName: identities[i] }));
        const totalBalance = list.reduce((sum, h) => sum + h.balance, 0);
        if (mountedRef.current) {
          setHolders(list);
          setTotal(totalBalance);
        }
      } catch (e: unknown) {
        if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }
    fetchHolders();
    return () => { mountedRef.current = false; };
  }, [api, isOpen, assetId]);

  // Filter holders by search (address or identity name)
  const filteredHolders = search.trim()
    ? holders.filter(h =>
        h.accountId.toLowerCase().includes(search.trim().toLowerCase()) ||
        (h.identityName && h.identityName.toLowerCase().includes(search.trim().toLowerCase()))
      )
    : holders;

  return (
    <BaseDialog isOpen={isOpen} onClose={onClose} title="Token Holders Distribution" className="w-[90vw] max-w-3xl">
      {loading ? (
        <div className="flex items-center justify-center py-8"><Spinner /></div>
      ) : error ? (
        <div className="text-red-500 p-4">{error}</div>
      ) : (
        <>
          <InputGroup
            leftIcon="search"
            placeholder="Search by address or name..."
            value={search}
            onChange={handleSearchChange}
            className="mb-4"
            fill
            autoFocus
          />
          <TokenHoldersPieChart holders={filteredHolders} total={total} />
          <HTMLTable className="w-full" striped>
            <thead>
              <tr>
                <th>Address</th>
                <th>Balance</th>
                <th>% Share</th>
              </tr>
            </thead>
            <tbody>
              {filteredHolders.length === 0 ? (
                <tr><td colSpan={3} className="text-center text-gray-500">No holders found</td></tr>
              ) : filteredHolders.map((h) => (
                <tr key={h.accountId}>
                  <td><AccountName address={h.accountId} /></td>
                  <td><FormattedAmount value={h.balance} decimals={decimals} unit={symbol} /></td>
                  <td>{total > 0 ? ((h.balance / total) * 100).toFixed(4) + '%' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        </>
      )}
    </BaseDialog>
  );
} 