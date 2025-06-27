import { Card, HTMLTable, Spinner, Icon, Button, Popover, Menu, Position } from "@blueprintjs/core";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useApi } from "app/components/Api";
import { FormattedAmount } from "app/components/common/FormattedAmount";
import { AccountName } from "app/components/common/AccountName";
import DialogObjectCard from "../dialogs/DialogObjectCard";
import DialogAssetDistribution from "../dialogs/DialogAssetDistribution";
import DialogSetAssetMetadata from '../dialogs/DialogSetAssetMetadata';
import DialogSetAssetTeam from '../dialogs/DialogSetAssetTeam';
import DialogMintAsset from '../dialogs/DialogMintAsset';
import DialogBurnAsset from '../dialogs/DialogBurnAsset';
import DialogFreezeAsset from '../dialogs/DialogFreezeAsset';
import DialogThawAsset from '../dialogs/DialogThawAsset';
import DialogTransferOwnership from '../dialogs/DialogTransferOwnership';
import DialogForceTransfer from '../dialogs/DialogForceTransfer';
import AssetActions from "./AssetActions";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "app/atoms";
import { useTranslation } from "react-i18next";
import { generateEvmContractAddress } from "app/utils/converter";
import type { TFunction } from "i18next";

interface AssetCardProps {
  assetId: number;
  inDialog?: boolean;
}

interface AssetDetails {
  owner: string;
  issuer: string;
  admin: string;
  freezer: string;
  supply: string | number;
  deposit: string | number;
  minBalance: string | number;
  isSufficient: boolean;
  accounts: number;
  sufficients: number;
  approvals: number;
  status: string;
  objDetails: null | {
    objIdx: number;
    propIdx: number;
    maxSupply: string | number;
  };
  reserved: string | number;
}

interface AssetMetadata {
  name: string;
  symbol: string;
  decimals: number;
  isFrozen: boolean;
}

interface PropertyDetails {
  name: string;
  class: string;
  maxValue: number;
}

// Type for objects that can be converted to human-readable format
type HumanReadable = {
  toHuman?: () => Record<string, unknown>;
  toJSON?: () => Record<string, unknown>;
};

// Type for Polkadot Option objects
type PolkadotOption<T = HumanReadable> = {
  isSome: boolean;
  unwrap: () => T;
  toHuman?: () => Record<string, unknown>;
  toJSON?: () => Record<string, unknown>;
};

function isOption(obj: unknown): obj is PolkadotOption {
  if (!obj || typeof obj !== 'object') return false;
  const option = obj as Record<string, unknown>;
  return typeof option.isSome === "boolean" && typeof option.unwrap === "function";
}

// Helper function to safely get human-readable data from an Option
function getOptionValue<T>(option: PolkadotOption<T>): T | Record<string, unknown> {
  if (option.toHuman && typeof option.toHuman === 'function') {
    return option.toHuman();
  }
  if (option.toJSON && typeof option.toJSON === 'function') {
    return option.toJSON();
  }
  return option.unwrap();
}

// Constants
const FETCH_DEBOUNCE_MS = 300; // 300ms debounce delay

interface AssetInfoSectionProps {
  details: AssetDetails;
  metadata: AssetMetadata;
  property?: PropertyDetails;
  maxSupply?: string | number;
  supplyValue: number | bigint;
  issuedPercent: string | null;
  evmContractAddress?: string;
  t: TFunction; // i18n translation function, now strictly typed
  userRole: "owner" | "admin" | "issuer" | "freezer" | null;
  inDialog?: boolean;
  linkedObjIdx: number | null;
  showObjectDialog?: boolean;
  handleOpenObjectDialog?: () => void;
  handleCloseObjectDialog?: () => void;
  showTeam?: boolean;
  handleToggleTeam?: () => void;
  handleCopyAddress?: () => void;
  showDistributionDialog?: boolean;
  handleOpenDistributionDialog?: () => void;
  handleCloseDistributionDialog?: () => void;
  showSetMetadataDialog?: boolean;
  handleOpenSetMetadataDialog?: () => void;
  handleCloseSetMetadataDialog?: () => void;
  showSetTeamDialog?: boolean;
  handleOpenSetTeamDialog?: () => void;
  handleCloseSetTeamDialog?: () => void;
  showMintDialog?: boolean;
  handleOpenMintDialog?: () => void;
  handleCloseMintDialog?: () => void;
  showBurnDialog?: boolean;
  handleOpenBurnDialog?: () => void;
  handleCloseBurnDialog?: () => void;
  showFreezeDialog?: boolean;
  handleOpenFreezeDialog?: () => void;
  handleCloseFreezeDialog?: () => void;
  showThawDialog?: boolean;
  handleOpenThawDialog?: () => void;
  handleCloseThawDialog?: () => void;
  showTransferOwnershipDialog?: boolean;
  handleOpenTransferOwnershipDialog?: () => void;
  handleCloseTransferOwnershipDialog?: () => void;
  showForceTransferDialog?: boolean;
  handleOpenForceTransferDialog?: () => void;
  handleCloseForceTransferDialog?: () => void;
  assetId: number;
  title: React.ReactNode;
}

function AssetInfoSection({
  details,
  metadata,
  property,
  maxSupply,
  supplyValue,
  issuedPercent,
  evmContractAddress,
  t,
  userRole,
  inDialog = false,
  linkedObjIdx,
  showObjectDialog = false,
  handleOpenObjectDialog = () => {},
  handleCloseObjectDialog = () => {},
  showTeam = false,
  handleToggleTeam = () => {},
  handleCopyAddress = () => {},
  showDistributionDialog = false,
  handleOpenDistributionDialog = () => {},
  handleCloseDistributionDialog = () => {},
  showSetMetadataDialog = false,
  handleOpenSetMetadataDialog = () => {},
  handleCloseSetMetadataDialog = () => {},
  showSetTeamDialog = false,
  handleOpenSetTeamDialog = () => {},
  handleCloseSetTeamDialog = () => {},
  showMintDialog = false,
  handleOpenMintDialog = () => {},
  handleCloseMintDialog = () => {},
  showBurnDialog = false,
  handleOpenBurnDialog = () => {},
  handleCloseBurnDialog = () => {},
  showFreezeDialog = false,
  handleOpenFreezeDialog = () => {},
  handleCloseFreezeDialog = () => {},
  showThawDialog = false,
  handleOpenThawDialog = () => {},
  handleCloseThawDialog = () => {},
  showTransferOwnershipDialog = false,
  handleOpenTransferOwnershipDialog = () => {},
  handleCloseTransferOwnershipDialog = () => {},
  showForceTransferDialog = false,
  handleOpenForceTransferDialog = () => {},
  handleCloseForceTransferDialog = () => {},
  assetId,
  title
}: AssetInfoSectionProps) {
  return (
    <div className="flex flex-col md:flex-row gap-0 mb-4 items-start">
      {/* Info */}
      <div className="flex-1 flex flex-col justify-start p-6 min-w-0 w-full md:w-auto">
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex w-full items-center justify-between gap-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {title}
              </h2>
              {!inDialog && linkedObjIdx !== null && !isNaN(linkedObjIdx) && (
                <Button icon="cube" onClick={handleOpenObjectDialog} className="ml-4">
                  {t("asset_card.view_object")}{linkedObjIdx}
                </Button>
              )}
            </div>
          </div>
          <HTMLTable className="w-full mb-2" striped>
            <tbody>
              <tr>
                <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Name</td>
                <td className="font-medium">{metadata.name}</td>
              </tr>
              <tr>
                <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Decimals</td>
                <td className="font-medium">{metadata.decimals}</td>
              </tr>
              <tr>
                <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Supply</td>
                <td className="font-medium">
                  <FormattedAmount value={supplyValue} decimals={metadata.decimals} unit={metadata.symbol} />
                  {issuedPercent && (
                    <span className="text-gray-500 ml-2">(Issued: {issuedPercent})</span>
                  )}
                </td>
              </tr>
              {typeof maxSupply !== 'undefined' && maxSupply !== null && (
                <tr>
                  <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Max supply</td>
                  <td className="font-medium">
                    <FormattedAmount value={typeof maxSupply === 'string' ? Number(maxSupply.replace(/,/g, '')) : maxSupply} decimals={metadata.decimals} unit={metadata.symbol} />
                  </td>
                </tr>
              )}
              <tr>
                <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Min Balance</td>
                <td className="font-medium">
                  <FormattedAmount value={typeof details.minBalance === 'string' ? Number(details.minBalance.replace(/,/g, '')) : details.minBalance} decimals={metadata.decimals} unit={metadata.symbol} />
                </td>
              </tr>
              <tr>
                <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Reserved</td>
                <td className="font-medium">
                  <FormattedAmount value={typeof details.reserved === 'string' ? Number(details.reserved.replace(/,/g, '')) : details.reserved} decimals={metadata.decimals} unit={metadata.symbol} />
                </td>
              </tr>
              <tr>
                <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Owner</td>
                <td className="font-medium flex items-center gap-2">
                  <AccountName address={details.owner} />
                  <Button
                    minimal
                    small
                    icon={showTeam ? "chevron-up" : "chevron-down"}
                    onClick={handleToggleTeam}
                    className="ml-2"
                  >
                    {showTeam ? t("asset_card.hide_team") : t("asset_card.show_team")}
                  </Button>
                </td>
              </tr>
              {showTeam && (
                <>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Issuer</td>
                    <td className="font-medium"><AccountName address={details.issuer} /></td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Admin</td>
                    <td className="font-medium"><AccountName address={details.admin} /></td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Freezer</td>
                    <td className="font-medium"><AccountName address={details.freezer} /></td>
                  </tr>
                </>
              )}
              <tr>
                <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Holders</td>
                <td className="font-medium">{typeof details.accounts === 'number' ? details.accounts : Number(details.accounts)}</td>
              </tr>
              <tr>
                <td className="text-gray-500 whitespace-nowrap pr-8 w-0">EVM Contract</td>
                <td className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs select-all">{evmContractAddress}</span>
                    <Button icon="duplicate" minimal small onClick={handleCopyAddress} title={t("asset_card.copy_address")} />
                  </div>
                </td>
              </tr>
            </tbody>
          </HTMLTable>
          {!inDialog && linkedObjIdx !== null && !isNaN(linkedObjIdx) && (
            <DialogObjectCard
              isOpen={showObjectDialog}
              onClose={handleCloseObjectDialog}
              objectIndex={linkedObjIdx}
            />
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button icon="pie-chart" onClick={handleOpenDistributionDialog}>
              {t("asset_card.tokens_distribution")}
            </Button>
            {userRole === "owner" && (
              <Button icon="edit" onClick={handleOpenSetMetadataDialog}>
                {t("asset_card.set_metadata")}
              </Button>
            )}
            {userRole === "owner" && (
              <Button icon="people" onClick={handleOpenSetTeamDialog}>
                {t("asset_card.set_team")}
              </Button>
            )}
            {userRole && (userRole === "owner" || userRole === "issuer") && (
              <Button icon="add" onClick={handleOpenMintDialog}>
                {t("asset_card.mint")}
              </Button>
            )}
            <DialogAssetDistribution
              isOpen={showDistributionDialog}
              onClose={handleCloseDistributionDialog}
              assetId={assetId}
              decimals={metadata.decimals}
              symbol={metadata.symbol}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssetCard({ assetId, inDialog = false }: AssetCardProps) {
  const { t } = useTranslation();
  const api = useApi();
  const [details, setDetails] = useState<AssetDetails | null>(null);
  const [metadata, setMetadata] = useState<AssetMetadata | null>(null);
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxSupply, setMaxSupply] = useState<string | number | undefined>(undefined);
  const [showObjectDialog, setShowObjectDialog] = useState(false);
  const [showDistributionDialog, setShowDistributionDialog] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showSetMetadataDialog, setShowSetMetadataDialog] = useState(false);
  const [showSetTeamDialog, setShowSetTeamDialog] = useState(false);
  const [showMintDialog, setShowMintDialog] = useState(false);
  const [showBurnDialog, setShowBurnDialog] = useState(false);
  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const [showThawDialog, setShowThawDialog] = useState(false);
  const [showTransferOwnershipDialog, setShowTransferOwnershipDialog] = useState(false);
  const [showForceTransferDialog, setShowForceTransferDialog] = useState(false);
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);

  // Request cancellation and debouncing refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentAssetIdRef = useRef<number | null>(null);

  // Calculate EVM contract address early
  const evmContractAddress = generateEvmContractAddress(assetId);

  // Memoized callbacks for dialog handlers
  const handleOpenObjectDialog = useCallback(() => {
    setShowObjectDialog(true);
  }, []);

  const handleCloseObjectDialog = useCallback(() => {
    setShowObjectDialog(false);
  }, []);

  const handleOpenDistributionDialog = useCallback(() => {
    setShowDistributionDialog(true);
  }, []);

  const handleCloseDistributionDialog = useCallback(() => {
    setShowDistributionDialog(false);
  }, []);

  const handleOpenSetMetadataDialog = useCallback(() => {
    setShowSetMetadataDialog(true);
  }, []);

  const handleCloseSetMetadataDialog = useCallback(() => {
    setShowSetMetadataDialog(false);
  }, []);

  const handleOpenSetTeamDialog = useCallback(() => {
    setShowSetTeamDialog(true);
  }, []);

  const handleCloseSetTeamDialog = useCallback(() => {
    setShowSetTeamDialog(false);
  }, []);

  const handleOpenMintDialog = useCallback(() => {
    setShowMintDialog(true);
  }, []);

  const handleCloseMintDialog = useCallback(() => {
    setShowMintDialog(false);
  }, []);

  const handleOpenBurnDialog = useCallback(() => {
    setShowBurnDialog(true);
  }, []);

  const handleCloseBurnDialog = useCallback(() => {
    setShowBurnDialog(false);
  }, []);

  const handleOpenFreezeDialog = useCallback(() => {
    setShowFreezeDialog(true);
  }, []);

  const handleCloseFreezeDialog = useCallback(() => {
    setShowFreezeDialog(false);
  }, []);

  const handleOpenThawDialog = useCallback(() => {
    setShowThawDialog(true);
  }, []);

  const handleCloseThawDialog = useCallback(() => {
    setShowThawDialog(false);
  }, []);

  const handleOpenTransferOwnershipDialog = useCallback(() => {
    setShowTransferOwnershipDialog(true);
  }, []);

  const handleCloseTransferOwnershipDialog = useCallback(() => {
    setShowTransferOwnershipDialog(false);
  }, []);

  const handleOpenForceTransferDialog = useCallback(() => {
    setShowForceTransferDialog(true);
  }, []);

  const handleCloseForceTransferDialog = useCallback(() => {
    setShowForceTransferDialog(false);
  }, []);

  const handleToggleTeam = useCallback(() => {
    setShowTeam((v) => !v);
  }, []);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard.writeText(evmContractAddress);
  }, [evmContractAddress]);

  // Main fetch function with cancellation
  const fetchData = useCallback(async (targetAssetId: number) => {
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
      if (!api) throw new Error("API not ready");

      // Check if request was cancelled
      if (signal.aborted) return;

      // Fetch asset details
      const assetOpt = await api.query.poscanAssets.asset(targetAssetId);
      
      // Check if request was cancelled
      if (signal.aborted) return;

      if (!isOption(assetOpt) || !assetOpt.isSome) {
        throw new Error("Asset not found");
      }

      // Use toHuman for easier field access
      const assetHuman = getOptionValue(assetOpt);
      const asset = assetHuman as AssetDetails;
      
      // Check if request was cancelled
      if (signal.aborted) return;

      // Fetch metadata
      const metaOpt = await api.query.poscanAssets.metadata(targetAssetId);
      
      // Check if request was cancelled
      if (signal.aborted) return;

      const metaHuman = metaOpt.toHuman ? metaOpt.toHuman() : metaOpt.toJSON();
      let meta: AssetMetadata;
      if (metaHuman && typeof metaHuman === 'object' && !Array.isArray(metaHuman)) {
        const metaObj = metaHuman as Record<string, unknown>;
        meta = {
          name: (metaObj.name as string) || "",
          symbol: (metaObj.symbol as string) || "",
          decimals: Number(metaObj.decimals) || 0,
          isFrozen: Boolean(metaObj.isFrozen),
        };
      } else {
        meta = { name: "", symbol: "", decimals: 0, isFrozen: false };
      }
      
      // Check if request was cancelled
      if (signal.aborted) return;

      // Fetch property if linked object is present
      let prop: PropertyDetails | null = null;
      if (asset?.objDetails?.propIdx != null) {
        const propIdxNum = typeof asset.objDetails.propIdx === 'string' ? parseInt(asset.objDetails.propIdx, 10) : asset.objDetails.propIdx;
        if (!isNaN(propIdxNum)) {
          const propOpt = await api.query.poScan.properties(propIdxNum);
          
          // Check if request was cancelled
          if (signal.aborted) return;

          if (isOption(propOpt) && propOpt.isSome) {
            const propHuman = getOptionValue(propOpt);
            prop = propHuman as PropertyDetails;
          }
        }
      }
      
      // Check if request was cancelled
      if (signal.aborted) return;

      // After fetching prop, extract maxValue (or maxSupply) if available
      let localMaxSupply: string | number | undefined;
      if (prop && typeof prop === 'object' && prop !== null) {
        if ('maxValue' in prop && (typeof prop.maxValue === 'string' || typeof prop.maxValue === 'number')) {
          localMaxSupply = prop.maxValue as string | number;
        } else if ('maxSupply' in prop && (typeof prop.maxSupply === 'string' || typeof prop.maxSupply === 'number')) {
          localMaxSupply = prop.maxSupply as string | number;
        }
      }
      
      // Only update state if this is still the current request
      if (!signal.aborted && currentAssetIdRef.current === targetAssetId) {
        setDetails(asset);
        setMetadata(meta);
        setProperty(prop);
        setMaxSupply(localMaxSupply);
        setLoading(false);
      }
    } catch (err: unknown) {
      // Don't update state if request was cancelled
      if (!signal.aborted && currentAssetIdRef.current === targetAssetId) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    }
  }, [api]);

  // Debounced fetch function
  const debouncedFetchData = useCallback((targetAssetId: number) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      // Only fetch if this is still the current asset ID
      if (currentAssetIdRef.current === targetAssetId) {
        fetchData(targetAssetId);
      }
    }, FETCH_DEBOUNCE_MS);
  }, [fetchData]);

  // Effect to handle asset ID changes
  useEffect(() => {
    // Update current asset ID ref
    currentAssetIdRef.current = assetId;
    
    // Trigger debounced fetch
    debouncedFetchData(assetId);

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
  }, [assetId, debouncedFetchData]);

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

  // Title logic
  let title: React.ReactNode = null;
  if (details && metadata) {
    let baseTitle = "";
    if (!details.objDetails) {
      baseTitle = t("asset_card.fungible_asset");
    } else if (details.objDetails.propIdx === 0) {
      baseTitle = t("asset_card.non_fungible_backed_asset");
    } else if (property) {
      baseTitle = `${property.name}-asset (${property.class.toLowerCase()})`;
    } else {
      baseTitle = t("asset_card.unknown_asset_type");
    }
    // Status icon and label
    let statusIcon: React.ReactNode = null;
    let statusLabel = "";
    if (metadata.isFrozen || (details.status && details.status.toLowerCase() === "frozen")) {
      statusIcon = <Icon icon="snowflake" intent="primary" className="ml-2" title={t("asset_card.frozen")} />;
      statusLabel = t("asset_card.frozen");
    } else if (details.status && details.status.toLowerCase() === "live") {
      statusIcon = <Icon icon="tick-circle" intent="success" className="ml-2" title={t("asset_card.live")} />;
      statusLabel = t("asset_card.live");
    }
    title = (
      <span className="flex items-center gap-2">
        {metadata.symbol && <span>{metadata.symbol}</span>}
        <span>-</span>
        <span>{baseTitle}</span>
        {statusIcon}
        {statusLabel && (
          <span className="text-xs text-gray-500 ml-1">{statusLabel}</span>
        )}
        <span className="text-xs text-gray-500 ml-2">{t("asset_card.asset_id")} {assetId}</span>
      </span>
    );
  }

  // Ensure supply is a number or bigint for FormattedAmount
  let supplyValue: number | bigint = 0;
  if (details?.supply) {
    if (typeof details.supply === "string") {
      supplyValue = Number(details.supply.replace(/,/g, ""));
    } else {
      supplyValue = details.supply;
    }
  }

  // Calculate issued percent if maxSupply is defined and > 0
  let issuedPercent: string | null = null;
  if (typeof maxSupply !== 'undefined' && maxSupply !== null) {
    const maxSupplyNum = typeof maxSupply === 'string' ? Number(maxSupply.replace(/,/g, '')) : maxSupply;
    if (maxSupplyNum > 0) {
      const percent = (Number(supplyValue) / Number(maxSupplyNum)) * 100;
      issuedPercent = percent.toFixed(2) + '%';
    }
  }

  // Get linked object index if present
  const linkedObjIdx = details?.objDetails?.objIdx != null
    ? (typeof details.objDetails.objIdx === 'string' ? parseInt(details.objDetails.objIdx, 10) : details.objDetails.objIdx)
    : null;

  // Determine user role for this asset
  let userRole: "owner" | "admin" | "issuer" | "freezer" | null = null;
  if (selectedAccount && details) {
    const account = selectedAccount.toLowerCase();
    if (details.owner && details.owner.toLowerCase() === account) userRole = "owner";
    else if (details.admin && details.admin.toLowerCase() === account) userRole = "admin";
    else if (details.issuer && details.issuer.toLowerCase() === account) userRole = "issuer";
    else if (details.freezer && details.freezer.toLowerCase() === account) userRole = "freezer";
  }

  return (
    <div className="w-full">
      <Card className="w-full hover:shadow-lg transition-shadow duration-200 mb-4 overflow-hidden relative">
        {/* Asset actions menu trigger */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <a
            href={`https://3dpscan.xyz/#/assets/${assetId}`}
            target="_blank"
            rel="noopener noreferrer"
            title={t("asset_card.view_on_explorer")}
          >
            <Button icon="share" minimal small />
          </a>
          {userRole && (
            <Popover
              position={Position.BOTTOM_RIGHT}
              minimal
              content={
                <Menu>
                  <AssetActions
                    onFreeze={handleOpenFreezeDialog}
                    onThaw={handleOpenThawDialog}
                    onBurn={handleOpenBurnDialog}
                    onTransferOwnership={handleOpenTransferOwnershipDialog}
                    onForceTransfer={handleOpenForceTransferDialog}
                    role={userRole}
                  />
                </Menu>
              }
            >
              <Button icon="more" minimal small />
            </Popover>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">{error}</div>
        ) : details && metadata ? (
          <AssetInfoSection
            details={details}
            metadata={metadata}
            property={property ?? undefined}
            maxSupply={maxSupply}
            supplyValue={supplyValue}
            issuedPercent={issuedPercent}
            evmContractAddress={evmContractAddress}
            t={t}
            userRole={userRole}
            inDialog={inDialog}
            linkedObjIdx={linkedObjIdx}
            showObjectDialog={showObjectDialog}
            handleOpenObjectDialog={handleOpenObjectDialog}
            handleCloseObjectDialog={handleCloseObjectDialog}
            showTeam={showTeam}
            handleToggleTeam={handleToggleTeam}
            handleCopyAddress={handleCopyAddress}
            showDistributionDialog={showDistributionDialog}
            handleOpenDistributionDialog={handleOpenDistributionDialog}
            handleCloseDistributionDialog={handleCloseDistributionDialog}
            showSetMetadataDialog={showSetMetadataDialog}
            handleOpenSetMetadataDialog={handleOpenSetMetadataDialog}
            handleCloseSetMetadataDialog={handleCloseSetMetadataDialog}
            showSetTeamDialog={showSetTeamDialog}
            handleOpenSetTeamDialog={handleOpenSetTeamDialog}
            handleCloseSetTeamDialog={handleCloseSetTeamDialog}
            showMintDialog={showMintDialog}
            handleOpenMintDialog={handleOpenMintDialog}
            handleCloseMintDialog={handleCloseMintDialog}
            showBurnDialog={showBurnDialog}
            handleOpenBurnDialog={handleOpenBurnDialog}
            handleCloseBurnDialog={handleCloseBurnDialog}
            showFreezeDialog={showFreezeDialog}
            handleOpenFreezeDialog={handleOpenFreezeDialog}
            handleCloseFreezeDialog={handleCloseFreezeDialog}
            showThawDialog={showThawDialog}
            handleOpenThawDialog={handleOpenThawDialog}
            handleCloseThawDialog={handleCloseThawDialog}
            showTransferOwnershipDialog={showTransferOwnershipDialog}
            handleOpenTransferOwnershipDialog={handleOpenTransferOwnershipDialog}
            handleCloseTransferOwnershipDialog={handleCloseTransferOwnershipDialog}
            showForceTransferDialog={showForceTransferDialog}
            handleOpenForceTransferDialog={handleOpenForceTransferDialog}
            handleCloseForceTransferDialog={handleCloseForceTransferDialog}
            assetId={assetId}
            title={title}
          />
        ) : null}
      </Card>
      <DialogSetAssetMetadata
        isOpen={showSetMetadataDialog}
        onClose={handleCloseSetMetadataDialog}
        assetId={assetId}
      />
      <DialogSetAssetTeam
        isOpen={showSetTeamDialog}
        onClose={handleCloseSetTeamDialog}
        assetId={assetId}
      />
      <DialogMintAsset
        isOpen={showMintDialog}
        onClose={handleCloseMintDialog}
        assetId={assetId}
      />
      <DialogBurnAsset
        isOpen={showBurnDialog}
        onClose={handleCloseBurnDialog}
        assetId={assetId}
      />
      <DialogFreezeAsset
        isOpen={showFreezeDialog}
        onClose={handleCloseFreezeDialog}
        assetId={assetId}
      />
      <DialogThawAsset
        isOpen={showThawDialog}
        onClose={handleCloseThawDialog}
        assetId={assetId}
      />
      <DialogTransferOwnership
        isOpen={showTransferOwnershipDialog}
        onClose={handleCloseTransferOwnershipDialog}
        assetId={assetId}
      />
      <DialogForceTransfer
        isOpen={showForceTransferDialog}
        onClose={handleCloseForceTransferDialog}
        assetId={assetId}
      />
    </div>
  );
} 