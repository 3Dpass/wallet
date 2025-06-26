import React, { useEffect, useState } from "react";
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

export default function DialogAssetDistribution({ isOpen, onClose, assetId, decimals, symbol }: DialogAssetDistributionProps) {
  const api = useApi();
  const [holders, setHolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    async function fetchHolders() {
      setLoading(true);
      setError(null);
      try {
        if (!api) throw new Error("API not ready");
        // Query all accounts for this asset
        const entries = await api.query.poscanAssets.account.entries(assetId);
        let list = entries.map(([storageKey, opt]) => {
          const accountId = storageKey.args[1]?.toString();
          const data = opt.toHuman ? opt.toHuman() : ((opt as any).unwrap ? (opt as any).unwrap().toJSON() : opt.toJSON());
          return {
            accountId,
            balance: Number(data?.balance?.toString().replace(/,/g, "")) || 0,
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
        if (mounted) {
          setHolders(list);
          setTotal(totalBalance);
        }
      } catch (e: any) {
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchHolders();
    return () => { mounted = false; };
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
            onChange={e => setSearch(e.target.value)}
            className="mb-4"
            fill
            autoFocus
          />
          <TokenHoldersPieChart holders={filteredHolders} total={total} symbol={symbol} />
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
              ) : filteredHolders.map((h, i) => (
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