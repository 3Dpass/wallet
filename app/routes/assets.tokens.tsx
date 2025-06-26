import { Card, Elevation, Spinner, Switch, Button, Icon, InputGroup } from "@blueprintjs/core";
import AssetsSection from "../components/assets/AssetsSection";
import AssetCard from "../components/assets/AssetCard";
import { useApi, useAccounts } from "app/components/Api";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "app/atoms";
import React, { useEffect, useState, useRef, useCallback } from "react";
import DialogCreateAsset from "../components/dialogs/DialogCreateAsset";
import { generateEvmContractAddress } from "app/utils/converter";

// Constants
const ASSET_REFRESH_DELAY_MS = 1000;
const FETCH_DEBOUNCE_MS = 300; // 300ms debounce delay

export default function AssetsTokens() {
  const api = useApi();
  const accounts = useAccounts();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [assetIds, setAssetIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [myAssetIds, setMyAssetIds] = useState<number[]>([]);
  const [userToggledShowAll, setUserToggledShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Request cancellation and debouncing refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentApiRef = useRef<any>(null);

  // Debounced fetch function for assets
  const debouncedFetchAssets = useCallback((targetApi: any) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      // Only fetch if this is still the current API
      if (currentApiRef.current === targetApi) {
        fetchAssets(targetApi);
      }
    }, FETCH_DEBOUNCE_MS);
  }, []);

  // Main fetch function with cancellation
  const fetchAssets = useCallback(async (targetApi: any) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setLoading(true);
    setError(null);
    
    try {
      if (!targetApi) throw new Error("API not ready");

      // Check if request was cancelled
      if (signal.aborted) return;

      const entries = await targetApi.query.poscanAssets.asset.entries();
      
      // Check if request was cancelled
      if (signal.aborted) return;

      const assetObjs = await Promise.all(
        entries.map(async ([key, opt]: [any, any]) => {
          // Check if request was cancelled during iteration
          if (signal.aborted) return null;
          
          const assetId = Number(key.args[0]?.toString());
          const details = opt.toHuman ? opt.toHuman() : (opt as any).unwrap ? (opt as any).unwrap().toJSON() : opt.toJSON();
          
          // Check if request was cancelled
          if (signal.aborted) return null;
          
          const metaOpt = await targetApi.query.poscanAssets.metadata(assetId);
          
          // Check if request was cancelled
          if (signal.aborted) return null;
          
          const metadata = metaOpt.toHuman ? metaOpt.toHuman() : metaOpt.toJSON();
          
          // Fetch property if needed
          let property = null;
          if (details?.objDetails?.propIdx != null) {
            const propIdxNum = typeof details.objDetails.propIdx === 'string' ? parseInt(details.objDetails.propIdx, 10) : details.objDetails.propIdx;
            if (!isNaN(propIdxNum)) {
              // Check if request was cancelled
              if (signal.aborted) return null;
              
              const propOpt = await targetApi.query.poScan.properties(propIdxNum);
              
              // Check if request was cancelled
              if (signal.aborted) return null;
              
              if (isOption(propOpt) && propOpt.isSome) {
                property = propOpt.toHuman ? propOpt.toHuman() : propOpt.unwrap().toJSON();
              }
            }
          }
          return { assetId, details, metadata, property };
        })
      );
      
      // Filter out null results (cancelled requests)
      const validAssetObjs = assetObjs.filter(obj => obj !== null);
      
      // Only update state if request wasn't cancelled
      if (!signal.aborted && currentApiRef.current === targetApi) {
        setAssets(validAssetObjs);
        setAssetIds(validAssetObjs.map(a => a.assetId));
      }
    } catch (e: any) {
      if (!signal.aborted && currentApiRef.current === targetApi) {
        setError(e.message || "Failed to load assets");
      }
    } finally {
      if (!signal.aborted && currentApiRef.current === targetApi) {
        setLoading(false);
      }
    }
  }, []);

  // Effect to handle API changes
  useEffect(() => {
    // Update current API ref
    currentApiRef.current = api;
    
    if (api) {
      // Trigger debounced fetch
      debouncedFetchAssets(api);
    }

    // Cleanup function
    return () => {
      // Clear timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      
      // Cancel ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [api, debouncedFetchAssets]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      
      // Cancel ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Fetch "My assets" (assets owned by selected account)
  useEffect(() => {
    let mounted = true;
    let abortController: AbortController | null = null;
    
    async function fetchMyAssets() {
      if (!api || !selectedAccount || assetIds.length === 0) {
        setMyAssetIds([]);
        return;
      }
      
      // Cancel any ongoing request
      if (abortController) {
        abortController.abort();
      }
      
      // Create new abort controller for this request
      abortController = new AbortController();
      const { signal } = abortController;
      
      setLoading(true);
      try {
        const owned: number[] = [];
        await Promise.all(
          assetIds.map(async (assetId) => {
            // Check if request was cancelled
            if (signal.aborted || !mounted) return;
            
            const assetOpt = await api.query.poscanAssets.asset(assetId);
            
            // Check if request was cancelled
            if (signal.aborted || !mounted) return;
            
            if (isOption(assetOpt) && assetOpt.isSome) {
              const asset = assetOpt.toHuman ? assetOpt.toHuman() : assetOpt.unwrap().toJSON();
              if (asset && typeof asset === 'object' && asset.owner === selectedAccount) {
                owned.push(assetId);
              }
            }
          })
        );
        
        // Only update state if request wasn't cancelled
        if (!signal.aborted && mounted) {
          setMyAssetIds(owned);
        }
      } catch (e: any) {
        if (!signal.aborted && mounted) {
          setError(e.message || "Failed to load my assets");
        }
      } finally {
        if (!signal.aborted && mounted) {
          setLoading(false);
        }
      }
    }
    
    if (api && selectedAccount && assetIds.length > 0) {
      fetchMyAssets();
    } else {
      setMyAssetIds([]);
    }
    
    return () => { 
      mounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [api, selectedAccount, assetIds]);

  // Auto-switch between "My assets" and "All assets" based on account presence and myAssetIds
  useEffect(() => {
    if (!userToggledShowAll) {
      if (accounts.length === 0 && !showAll) {
        setShowAll(true);
      } else if (accounts.length > 0 && showAll && myAssetIds.length > 0) {
        setShowAll(false);
      } else if (accounts.length > 0 && myAssetIds.length === 0 && !showAll) {
        setShowAll(true);
      }
    }
  }, [accounts.length, showAll, userToggledShowAll, myAssetIds.length]);

  const handleShowAllToggle = () => {
    setShowAll((v) => !v);
    setUserToggledShowAll(true);
  };

  // Determine which asset IDs to show
  const visibleAssetIds = showAll ? assetIds : myAssetIds;

  // Helper to get asset type/title
  function getAssetType(details: any, property: any) {
    if (!details.objDetails) return "fungible";
    if (details.objDetails.propIdx === 0) return "non-fungible";
    if (property) return property.class?.toLowerCase() || "unknown";
    return "unknown";
  }

  // Build asset objects for visibleAssetIds
  const assetObjs = assets.filter(a => visibleAssetIds.includes(a.assetId));

  // Filter asset objects by search
  const searchStr = search.trim().toLowerCase();
  const filteredAssets = assetObjs.filter(asset => {
    const assetIdStr = String(asset.assetId);
    const symbol = asset.metadata?.symbol || "";
    const name = asset.metadata?.name || "";
    const evm = generateEvmContractAddress(asset.assetId);
    const type = getAssetType(asset.details, asset.property);
    return (
      assetIdStr.includes(searchStr) ||
      symbol.toLowerCase().includes(searchStr) ||
      name.toLowerCase().includes(searchStr) ||
      evm.toLowerCase().includes(searchStr) ||
      type.toLowerCase().includes(searchStr)
    );
  });

  // Add a handler to refresh assets after creation
  const handleAssetCreated = () => {
    if (api) {
      // Re-fetch assets
      setTimeout(() => {
        window.location.reload(); // simplest way to refresh for now
      }, ASSET_REFRESH_DELAY_MS);
    }
  };

  return (
    <AssetsSection>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center mb-0">
          Tokens
          {loading ? (
            <Spinner size={16} className="ml-2" />
          ) : (
            <span className="ml-2">({filteredAssets.length})</span>
          )}
        </h2>
        <div className="flex items-center gap-6">
          <Button icon="plus" intent="primary" onClick={() => setShowCreateDialog(true)}>
            New asset
          </Button>
          <Switch
            checked={showAll}
            label={showAll ? "All assets" : "My assets"}
            onChange={handleShowAllToggle}
          />
        </div>
      </div>
      <div className="w-full mb-4">
        <InputGroup
          leftIcon="search"
          placeholder="Search by Asset ID, Symbol, Name, EVM address, or Type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4"
          fill
        />
      </div>
      <Card elevation={Elevation.ONE} className="p-4">
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
            <Icon icon="inbox" iconSize={50} className="mb-4" />
            <div className="text-lg">
              {showAll ? "No assets found." : "No assets found for your account."}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-4xl mx-auto">
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.assetId} assetId={asset.assetId} />
            ))}
          </div>
        )}
      </Card>
      <DialogCreateAsset
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handleAssetCreated}
      />
    </AssetsSection>
  );
}

function isOption(obj: any): obj is { isSome: boolean; unwrap: () => any; toHuman?: () => any; toJSON?: () => any } {
  return obj && typeof obj.isSome === "boolean" && typeof obj.unwrap === "function";
} 