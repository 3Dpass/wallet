import { HTMLTable, InputGroup, Spinner } from "@blueprintjs/core";
import type { ApiPromise } from "@polkadot/api";
import { useApi } from "app/components/Api";
import { AccountName } from "app/components/common/AccountName";
import { FormattedAmount } from "app/components/common/FormattedAmount";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import BaseDialog from "./BaseDialog";
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
};

function isOption(obj: unknown): obj is PolkadotOption {
  if (!obj || typeof obj !== "object") return false;
  const option = obj as Record<string, unknown>;
  return (
    typeof option.isSome === "boolean" && typeof option.unwrap === "function"
  );
}

// Helper function to parse balance from Polkadot data
function parseBalance(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const balanceData = data as Record<string, unknown>;
  const balanceStr = balanceData?.balance?.toString();
  if (!balanceStr) return 0;
  return Number(balanceStr.replace(/,/g, "")) || 0;
}

// Helper function to fetch identity for an account
async function fetchIdentity(
  api: ApiPromise,
  accountId: string
): Promise<string | null> {
  try {
    const info = await api.derive.accounts.info(accountId);
    return info.identity?.display || null;
  } catch {
    return null;
  }
}

function _HoldersTable({
  holders,
  decimals,
  symbol,
  total,
  t,
}: {
  holders: Holder[];
  decimals: number;
  symbol: string;
  total: number;
  t: (key: string) => string;
}) {
  return (
    <HTMLTable className="w-full" striped>
      <thead>
        <tr>
          <th>{t("dlg_asset_distribution.address")}</th>
          <th>{t("dlg_asset_distribution.balance")}</th>
          <th>{t("dlg_asset_distribution.share_percentage")}</th>
        </tr>
      </thead>
      <tbody>
        {holders.length === 0 ? (
          <tr>
            <td colSpan={3} className="text-center text-gray-500">
              {t("dlg_asset_distribution.no_holders_found")}
            </td>
          </tr>
        ) : (
          holders.map((h) => (
            <tr key={h.accountId}>
              <td>
                <AccountName address={h.accountId} />
              </td>
              <td>
                <FormattedAmount
                  value={h.balance}
                  decimals={decimals}
                  unit={symbol}
                />
              </td>
              <td>
                {total > 0 ? `${((h.balance / total) * 100).toFixed(4)}%` : "-"}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </HTMLTable>
  );
}

export default function DialogAssetDistribution({
  isOpen,
  onClose,
  assetId,
  decimals,
  symbol,
}: DialogAssetDistributionProps) {
  const api = useApi();
  const { t } = useTranslation();
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const mountedRef = useRef(true);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const _handleLoadNext = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const _handleLoadPrevious = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  // Reset current page when search changes
  useEffect(() => {
    setCurrentPage(1);
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

        // Parse holder data
        let list = entries
          .map(([storageKey, opt]) => {
            const accountId = storageKey.args[1]?.toString();
            if (!accountId) return null;

            const data = opt.toHuman
              ? opt.toHuman()
              : isOption(opt)
                ? opt.unwrap().toJSON()
                : opt.toJSON();
            const balance = parseBalance(data);

            return {
              accountId,
              balance,
              identityName: null as string | null,
            };
          })
          .filter((h): h is Holder => h !== null && h.balance > 0);

        // Fetch identities in parallel
        const identities = await Promise.all(
          list.map((h) => fetchIdentity(api, h.accountId))
        );

        // Combine holder data with identities
        list = list.map((h, i) => ({ ...h, identityName: identities[i] }));

        const totalBalance = list.reduce((sum, h) => sum + h.balance, 0);

        if (mountedRef.current) {
          setHolders(list);
          setTotal(totalBalance);
        }
      } catch (e: unknown) {
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    fetchHolders();
    return () => {
      mountedRef.current = false;
    };
  }, [api, isOpen, assetId]);

  // Filter holders by search (address or identity name)
  const filteredHolders = useMemo(() => {
    if (!search.trim()) return holders;

    const searchTerm = search.trim().toLowerCase();
    return holders.filter(
      (h) =>
        h.accountId.toLowerCase().includes(searchTerm) ||
        h.identityName?.toLowerCase().includes(searchTerm)
    );
  }, [holders, search]);

  // Calculate pagination values
  const totalPages = Math.ceil(filteredHolders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const _currentHolders = filteredHolders.slice(startIndex, endIndex);
  const _hasNextPage = currentPage < totalPages;
  const _hasPreviousPage = currentPage > 1;

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("assets.token_holders_distribution")}
      className="w-[90vw] max-w-3xl"
    >
      <div className="p-6">
        <div className="mb-4">
          <InputGroup
            placeholder={t("dlg_asset_distribution.search_placeholder")}
            leftIcon="search"
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size={24} />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : holders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t("dlg_asset_distribution.no_holders_found")}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pie Chart */}
            <div className="flex justify-center">
              <TokenHoldersPieChart
                holders={filteredHolders.map(h => ({ accountId: h.accountId, balance: h.balance }))}
                total={total}
              />
            </div>
            
            {/* Table */}
            <HTMLTable className="w-full" striped>
              <thead>
                <tr>
                  <th>{t("dlg_asset_distribution.address")}</th>
                  <th>{t("dlg_asset_distribution.balance")}</th>
                  <th>{t("dlg_asset_distribution.share_percentage")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHolders.map((holder) => (
                  <tr key={holder.accountId}>
                    <td>
                      <div className="flex items-center gap-2">
                        <AccountName address={holder.accountId} />
                      </div>
                    </td>
                    <td>
                      <FormattedAmount
                        value={holder.balance}
                        decimals={decimals}
                        unit={symbol}
                      />
                    </td>
                    <td>
                      {holder.identityName
                        ? `${((holder.balance / total) * 100).toFixed(4)}%`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </HTMLTable>
          </div>
        )}
      </div>
    </BaseDialog>
  );
}
