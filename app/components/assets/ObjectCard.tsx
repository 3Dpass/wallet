import { Card, HTMLTable, Button, Collapse, Spinner, Icon, Classes, Popover, Intent } from "@blueprintjs/core";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useCallback } from "react";
import * as THREE from "three";
import { OBJLoader } from "three-stdlib";
import ThreeDObject from "../block/ThreeDObject.client";
import { useApi } from "app/components/Api";
import React, { useEffect, useState } from "react";
import { AccountName } from "app/components/common/AccountName";
import { Buffer } from "node:buffer";
import DialogAssetCard from "../dialogs/DialogAssetCard";
import DialogCreateAsset from "../dialogs/DialogCreateAsset";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "app/atoms";
import { P3D_DECIMALS_FACTOR } from "app/utils/converter";

// Constants
const FETCH_DEBOUNCE_MS = 300; // 300ms debounce delay

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

// Type for property objects with various naming conventions
type PropertyObject = {
  propIdx?: string | number;
  prop_idx?: string | number;
  PropIdx?: string | number;
  maxValue?: string | number;
  max_value?: string | number;
  MaxValue?: string | number;
};

// Type for linked assets
type LinkedAsset = {
  assetId: number;
  details: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

// Type for object state
type ObjectState = Record<string, number | string>;

// Type for object data as returned from api.query.poScan.objects(u32)
interface ObjectData {
  state?: ObjectState;
  isPrivate?: boolean;
  whenCreated?: number;
  numApprovals?: number;
}

// Type for asset details with objDetails
interface AssetDetails {
  objDetails?: {
    objIdx: number | string;
    propIdx: number | string;
  };
  [key: string]: unknown;
}

interface ObjectCardProps {
  objectIndex: number;
  objectData: ObjectData;
}

interface RpcObjectData {
  state: ObjectState;
  obj: number[];
  compressed_with: string | null;
  category: Record<string, unknown>;
  hashes: string[];
  when_created: number;
  when_approved: number;
  owner: string;
  estimators: [string, number][];
  est_outliers: string[];
  approvers: Array<{
    account_id: string;
    when: number;
    proof: string;
  }>;
  num_approvals: number;
  est_rewards: number;
  author_rewards: number;
  prop: Array<{
    propIdx: number;
    maxValue: number;
  }>;
}

// Type for state info return value
type StateInfo = {
  label: string;
  icon: string;
  intent: Intent;
};

// Type for Blueprint icons
type BlueprintIcon = 'help' | 'confirm' | 'error' | 'time' | 'chart' | 'refresh' | 'plus' | 'info-sign';

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

// Helper function to safely convert AnyJson to Record<string, unknown>
function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export default function ObjectCard({ objectIndex, objectData }: ObjectCardProps) {
  const api = useApi();
  const [objString, setObjString] = useState<string | null>(null);
  const [rpcData, setRpcData] = useState<RpcObjectData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEstimators, setShowEstimators] = useState(false);
  const [showApprovers, setShowApprovers] = useState(false);
  const [showOutliers, setShowOutliers] = useState(false);
  const [propertyDefs, setPropertyDefs] = useState<Record<number, { name: string; maxValue: number }>>({});
  const [linkedAssets, setLinkedAssets] = useState<LinkedAsset[]>([]);
  const [linkedAssetsLoading, setLinkedAssetsLoading] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [showCreateAssetDialog, setShowCreateAssetDialog] = useState(false);
  const [selectedPropertyForTokenization, setSelectedPropertyForTokenization] = useState<{ objIdx: number; propIdx: number } | null>(null);
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);

  // Request cancellation and debouncing refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentObjectIndexRef = useRef<number | null>(null);

  // Memoized callbacks for JSX props
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleToggleEstimators = useCallback(() => {
    setShowEstimators((v) => !v);
  }, []);

  const handleToggleApprovers = useCallback(() => {
    setShowApprovers((v) => !v);
  }, []);

  const handleToggleOutliers = useCallback(() => {
    setShowOutliers((v) => !v);
  }, []);

  const handleSetSelectedAssetId = useCallback((assetId: number) => {
    setSelectedAssetId(assetId);
  }, []);

  const handleCloseSelectedAsset = useCallback(() => {
    setSelectedAssetId(null);
  }, []);

  const handleCloseCreateAssetDialog = useCallback(() => {
    setShowCreateAssetDialog(false);
    setSelectedPropertyForTokenization(null);
  }, []);

  const handleTokenizeProperty = useCallback((objIdx: number, propIdx: number) => {
    setSelectedPropertyForTokenization({ objIdx, propIdx });
    setShowCreateAssetDialog(true);
  }, []);

  const createAssetClickHandler = useCallback((assetId: number) => {
    return () => handleSetSelectedAssetId(assetId);
  }, [handleSetSelectedAssetId]);

  const createTokenizePropertyClickHandler = useCallback((objIdx: number, propIdx: number) => {
    return () => handleTokenizeProperty(objIdx, propIdx);
  }, [handleTokenizeProperty]);

  // Main fetch function with cancellation
  const fetchObj = useCallback(async (targetObjectIndex: number) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    if (!api) {
      if (!signal.aborted && currentObjectIndexRef.current === targetObjectIndex) {
        setObjString(null);
        setRpcData(null);
        setIsLoading(false);
      }
      return;
    }
    
    // Set loading state
    if (!signal.aborted && currentObjectIndexRef.current === targetObjectIndex) {
      setIsLoading(true);
    }
    
    try {
      // @ts-ignore - poscan is a custom RPC
      const result = await api.rpc.poscan.getPoscanObject(targetObjectIndex);
      
      // Check if request was cancelled
      if (signal.aborted || currentObjectIndexRef.current !== targetObjectIndex) return;

      let patchedResult = result;
      if (result && !result.est_outliers && result.estOutliers) {
        patchedResult = { ...result, est_outliers: result.estOutliers };
      }
      if (patchedResult && !patchedResult.prop && patchedResult.props) {
        patchedResult = { ...patchedResult, prop: patchedResult.props };
      }
      if (patchedResult && patchedResult.prop && Array.isArray(patchedResult.prop)) {
        let normalizedProps = patchedResult.prop.map((p: PropertyObject) => {
          if (p && typeof p === 'object') {
            return {
              propIdx: p.propIdx ?? p.prop_idx ?? p.PropIdx ?? '',
              maxValue: p.maxValue ?? p.max_value ?? p.MaxValue ?? '',
            };
          }
          return p;
        });
        if (!normalizedProps.some((p: { propIdx: string | number }) => Number(p.propIdx) === 1)) {
          normalizedProps.push({ propIdx: 1, maxValue: 0 });
        }
        patchedResult = {
          ...patchedResult,
          prop: normalizedProps
        };
      }
      if (patchedResult && patchedResult.obj && Array.isArray(patchedResult.obj)) {
        const str = String.fromCharCode(...patchedResult.obj);
        if (!signal.aborted && currentObjectIndexRef.current === targetObjectIndex) {
          setObjString(str);
          setRpcData(patchedResult as RpcObjectData);
          setIsLoading(false);
        }
      } else {
        if (!signal.aborted && currentObjectIndexRef.current === targetObjectIndex) {
          setObjString(null);
          setRpcData(null);
          setIsLoading(false);
        }
      }
    } catch (e) {
      if (!signal.aborted && currentObjectIndexRef.current === targetObjectIndex) {
        setObjString(null);
        setRpcData(null);
        setIsLoading(false);
      }
    }
  }, [api]);

  // Debounced fetch function
  const debouncedFetchObj = useCallback((targetObjectIndex: number) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      // Only fetch if this is still the current object index
      if (currentObjectIndexRef.current === targetObjectIndex) {
        fetchObj(targetObjectIndex);
      }
    }, FETCH_DEBOUNCE_MS);
  }, [fetchObj]);

  // Effect to handle object index changes
  useEffect(() => {
    // Update current object index ref
    currentObjectIndexRef.current = objectIndex;
    
    // Trigger debounced fetch
    debouncedFetchObj(objectIndex);

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
  }, [objectIndex, debouncedFetchObj]);

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

  // Parse OBJ to mesh
  const mesh = useMemo(() => {
    if (!objString) return null;
    try {
      const loader = new OBJLoader();
      const parsed = loader.parse(objString);
      const firstChild = parsed.children[0];
      if (firstChild && (firstChild as THREE.Mesh).isMesh && (firstChild as THREE.Mesh).geometry) {
        return firstChild as THREE.Mesh;
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [objString]);

  // State row as array of React nodes for proper formatting and links
  const stateRow = objectData?.state
    ? Object.entries(objectData.state).map(([k, v], idx, arr) => {
        let node;
        if (typeof v === 'number') {
          const label = k === 'notApproved' ? 'Disapproved' : k.charAt(0).toUpperCase() + k.slice(1);
          node = (
            <>
              {label}: <a
                href={`https://3dpscan.xyz/#/blocks/${v}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {v}
              </a>
            </>
          );
        } else {
          node = `${k}: ${v}`;
        }
        return (
          <React.Fragment key={k}>
            {node}
            {idx < arr.length - 1 ? ', ' : null}
          </React.Fragment>
        );
      })
    : "-";

  // Helper function to get state info
  const getStateInfo = (): StateInfo => {
    if (!objectData?.state) return { label: 'Unknown', icon: 'help' as BlueprintIcon, intent: 'none' };
    
    const stateKeys = Object.keys(objectData.state);
    if (stateKeys.length === 0) return { label: 'Unknown', icon: 'help' as BlueprintIcon, intent: 'none' };
    
    if (stateKeys.includes('approved')) {
      return { label: 'Approved', icon: 'confirm' as BlueprintIcon, intent: 'success' };
    }
    if (stateKeys.includes('notApproved')) {
      return { label: 'Disapproved', icon: 'error' as BlueprintIcon, intent: 'danger' };
    }
    if (stateKeys.includes('approving')) {
      return { label: 'Approving', icon: 'time' as BlueprintIcon, intent: 'warning' };
    }
    if (stateKeys.includes('estimated')) {
      return { label: 'Estimated', icon: 'chart' as BlueprintIcon, intent: 'primary' };
    }
    if (stateKeys.includes('estimating')) {
      return { label: 'Estimating', icon: 'refresh' as BlueprintIcon, intent: 'warning' };
    }
    if (stateKeys.includes('created')) {
      return { label: 'Created', icon: 'plus' as BlueprintIcon, intent: 'none' };
    }
    
    const firstState = stateKeys[0];
    return { 
      label: firstState.charAt(0).toUpperCase() + firstState.slice(1), 
      icon: 'info-sign' as BlueprintIcon, 
      intent: 'none' 
    };
  };

  const stateInfo = getStateInfo();

  // Format rewards
  const formatRewards = (amount: number) => {
    return (amount / P3D_DECIMALS_FACTOR).toFixed(6) + " P3D";
  };

  // Fetch property names for each propIdx in rpcData.prop
  useEffect(() => {
    async function fetchPropertyNames() {
      if (!api || !rpcData || !rpcData.prop || rpcData.prop.length === 0) {
        setPropertyDefs({});
        return;
      }
      try {
        const propIdxs = rpcData.prop.map((p) => Number(p.propIdx));
        const queries = propIdxs.map((idx) => api.query.poScan.properties(idx));
        const results = await Promise.all(queries);
        const defs: Record<number, { name: string; maxValue: number }> = {};
        results.forEach((opt, i) => {
          let name = '';
          let maxValue = 1;
          if (opt && typeof opt === 'object' && 'isSome' in opt && opt.isSome && 'unwrap' in opt) {
            const option = opt as { unwrap: () => unknown };
            const unwrapped = option.unwrap();
            const prop = unwrapped && typeof unwrapped === 'object' && 'toJSON' in unwrapped 
              ? (unwrapped as { toJSON: () => Record<string, unknown> }).toJSON()
              : (unwrapped as Record<string, unknown>);
            if (typeof prop.name === 'string') {
              name = prop.name;
            } else if (prop.name && typeof prop.name === 'object' && (prop.name as Record<string, unknown>)['Raw']) {
              name = (prop.name as Record<string, unknown>)['Raw'] as string;
            }
            if (typeof name === 'string' && name.startsWith('0x')) {
              try {
                const hex = name.slice(2);
                let str = '';
                for (let j = 0; j < hex.length; j += 2) {
                  str += String.fromCharCode(parseInt(hex.substr(j, 2), 16));
                }
                name = str;
              } catch (e) {}
            }
            maxValue = (prop.maxValue ?? prop.max_value ?? 1) as number;
          } else {
            name = `Property ${propIdxs[i]}`;
            maxValue = 1;
          }
          defs[propIdxs[i]] = { name, maxValue };
        });
        setPropertyDefs(defs);
      } catch (e) {
        setPropertyDefs({});
      }
    }
    fetchPropertyNames();
  }, [api, rpcData && rpcData.prop && rpcData.prop.map((p) => p.propIdx).join(",")]);

  // Fetch all assets and find those linked to this object
  useEffect(() => {
    let mounted = true;
    let abortController: AbortController | null = null;
    
    async function fetchLinkedAssets() {
      if (!api) return;
      
      // Cancel any ongoing request
      if (abortController) {
        abortController.abort();
      }
      
      // Create new abort controller for this request
      abortController = new AbortController();
      const { signal } = abortController;
      
      setLinkedAssetsLoading(true);
      try {
        const entries = await api.query.poscanAssets.asset.entries();
        
        // Check if request was cancelled
        if (signal.aborted || !mounted) return;
        
        const linked: LinkedAsset[] = [];
        for (const [key, opt] of entries) {
          // Check if request was cancelled during iteration
          if (signal.aborted || !mounted) return;
          
          const assetId = Number(key.args[0]?.toString());
          let details: AssetDetails;
          if (opt.toHuman) {
            details = toRecord(opt.toHuman()) as AssetDetails;
          } else if (isOption(opt) && opt.isSome) {
            const unwrapped = getOptionValue(opt);
            const prop = toRecord(unwrapped);
            details = prop as AssetDetails;
          } else {
            details = toRecord(opt.toJSON()) as AssetDetails;
          }
          if (details?.objDetails?.objIdx != null) {
            const objIdxNum = typeof details.objDetails.objIdx === 'string' ? parseInt(details.objDetails.objIdx, 10) : details.objDetails.objIdx;
            if (objIdxNum === objectIndex) {
              linked.push({ assetId, details });
            }
          }
        }
        
        // Only update state if request wasn't cancelled
        if (!signal.aborted && mounted) {
          setLinkedAssets(linked);
        }
      } catch (e) {
        if (!signal.aborted && mounted) {
          setLinkedAssets([]);
        }
      } finally {
        if (!signal.aborted && mounted) {
          setLinkedAssetsLoading(false);
        }
      }
    }
    
    fetchLinkedAssets();
    
    return () => { 
      mounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [api, objectIndex]);

  return (
    <div className="w-full">
      <Card className="w-full hover:shadow-lg transition-shadow duration-200 mb-4 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-0 mb-4 items-start">
          {/* Preview Left (fixed width) */}
          <div className="md:w-80 flex-shrink-0 flex items-center justify-center overflow-hidden h-[260px] relative w-full md:w-80">
            {mesh && mesh.geometry ? (
              <>
                <Canvas camera={{ fov: 30, near: 0.1, far: 1000, position: [0, 0, 2] }}>
                  <Suspense fallback={null}>
                    <ThreeDObject geometry={mesh.geometry} />
                  </Suspense>
                </Canvas>
                {objString && (
                  <div className="absolute top-2 right-2 z-10 flex gap-2">
                    <a
                      className={Classes.BUTTON}
                      href={`data:text/plain;base64,${Buffer.from(objString).toString('base64')}`}
                      download={`3dpass-object-${objectIndex}.obj`}
                      title="Download OBJ file"
                    >
                      <Icon icon="download" />
                    </a>
                    <Popover
                      content={
                        <div className="p-4">
                          {rpcData && rpcData.hashes && rpcData.hashes.length > 0 && (
                            <>
                              <div className="font-mono mb-2">Hash ID Objects3D: Grid2dLow</div>
                              <code className="block text-xs">
                                {rpcData.hashes.map((hash) => (
                                  <div key={hash}>{hash}</div>
                                ))}
                              </code>
                            </>
                          )}
                        </div>
                      }
                      position="bottom"
                    >
                      <Button icon="info-sign" className={Classes.BUTTON} />
                    </Popover>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                {isLoading ? (
                  <>
                    <Spinner size={24} />
                    <span className="text-gray-400 mt-2">Loading...</span>
                  </>
                ) : (
                  <span className="text-gray-400">No preview</span>
                )}
              </div>
            )}
          </div>
          {/* Info Right (flex-1) */}
          <div className="flex-1 flex flex-col justify-start p-6 min-w-0 w-full md:w-auto">
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Object {objectIndex}
                  {stateInfo.icon && stateInfo.icon !== 'help' && (
                    <Icon icon={stateInfo.icon as BlueprintIcon} intent={stateInfo.intent} title={stateInfo.label} className="ml-2" />
                  )}
                </h2>
                <Button
                  minimal
                  icon={isExpanded ? "chevron-up" : "chevron-down"}
                  onClick={handleToggleExpanded}
                  text={isExpanded ? "Hide Details" : "Show Details"}
                />
              </div>
              <HTMLTable className="w-full mb-2" striped>
                <tbody>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">State</td>
                    <td className="font-medium">{stateRow}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Rights</td>
                    <td className="font-medium">{objectData?.isPrivate ? 'Private' : 'Public'}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Created</td>
                    <td className="font-medium">
                      {objectData?.whenCreated ? (
                        <a
                          href={`https://3dpscan.xyz/#/blocks/${objectData.whenCreated}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {objectData.whenCreated}
                        </a>
                      ) : "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Approvals</td>
                    <td className="font-medium">{objectData?.numApprovals ?? "-"}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Owner</td>
                    <td className="font-medium">
                      {rpcData && rpcData.owner ? (
                        <div className="flex items-center gap-2">
                          <AccountName address={rpcData.owner} />
                        </div>
                      ) : "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">Properties</td>
                    <td className="font-medium">
                      {rpcData && rpcData.prop && rpcData.prop.length > 0 ? (
                        <div className="space-y-2">
                          {rpcData.prop.map((p) => {
                            const def = propertyDefs[Number(p.propIdx)];
                            const name = def?.name || `Property ${p.propIdx}`;
                            const max = def?.maxValue ?? 1;
                            // Check if this property has a linked asset
                            const hasLinkedAsset = linkedAssets.some(asset => {
                              const objDetails = asset.details.objDetails as AssetDetails['objDetails'];
                              if (!objDetails) return false;
                              const assetObjIdx = typeof objDetails.objIdx === 'string' 
                                ? parseInt(objDetails.objIdx, 10) 
                                : objDetails.objIdx;
                              const assetPropIdx = typeof objDetails.propIdx === 'string' 
                                ? parseInt(objDetails.propIdx, 10) 
                                : objDetails.propIdx;
                              const currentPropIdx = Number(p.propIdx);
                              
                              return assetObjIdx === objectIndex && assetPropIdx === currentPropIdx;
                            });
                            return (
                              <div key={p.propIdx} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {hasLinkedAsset && <Icon icon="dollar" intent="success" />}
                                  <span className={hasLinkedAsset ? 'text-green-300 font-semibold' : ''}>
                                    {name}: {max}
                                  </span>
                                </div>
                                {!hasLinkedAsset && rpcData?.owner === selectedAccount && (
                                  <Button
                                    icon="dollar"
                                    text="Tokenize"
                                    className={Classes.BUTTON}
                                    onClick={createTokenizePropertyClickHandler(objectIndex, Number(p.propIdx))}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                </tbody>
              </HTMLTable>
            </div>
          </div>
        </div>

        {/* Detailed Information - Collapsible */}
        <Collapse isOpen={isExpanded}>
          {rpcData && (
            <div className="space-y-4 pt-4 border-t">
              <HTMLTable className="w-full" striped>
                <tbody>
                  <tr>
                    <td className="shadow-none font-medium pr-4">Estimator Rewards</td>
                    <td className="shadow-none">{formatRewards(rpcData.est_rewards)}</td>
                  </tr>
                  <tr>
                    <td className="shadow-none font-medium pr-4">Author Rewards</td>
                    <td className="shadow-none">{formatRewards(rpcData.author_rewards)}</td>
                  </tr>
                </tbody>
              </HTMLTable>
              {rpcData.estimators.length > 0 && rpcData.hashes.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Button
                      minimal
                      icon={showEstimators ? "chevron-up" : "chevron-down"}
                      onClick={handleToggleEstimators}
                      text={showEstimators ? `Hide Estimators (${rpcData.estimators.length})` : `Show Estimators (${rpcData.estimators.length})`}
                      className="mb-2"
                    />
                    {showEstimators && (
                      <div className="space-y-1 mt-2">
                        {rpcData.estimators
                          .sort(([, a], [, b]) => a - b) // Sort by numeric value (ascending)
                          .map(([account, value]) => (
                          <div key={`estimator-${account}-${value}`} className="text-sm flex items-center gap-2 font-mono text-xs">
                            <AccountName address={account} />
                            <span className="ml-2 text-gray-600">({value} ms)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : rpcData.estimators.length > 0 ? (
                <div>
                  <Button
                    minimal
                    icon={showEstimators ? "chevron-up" : "chevron-down"}
                    onClick={handleToggleEstimators}
                    text={showEstimators ? `Hide Estimators (${rpcData.estimators.length})` : `Show Estimators (${rpcData.estimators.length})`}
                    className="mb-2"
                  />
                  {showEstimators && (
                    <div className="space-y-1 mt-2">
                      {rpcData.estimators
                        .sort(([, a], [, b]) => a - b) // Sort by numeric value (ascending)
                        .map(([account, value]) => (
                        <div key={`estimator-${account}-${value}`} className="text-sm flex items-center gap-2 font-mono text-xs">
                          <AccountName address={account} />
                          <span className="ml-2 text-gray-600">({value} ms)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              {rpcData.approvers.length > 0 && (
                <div>
                  <Button
                    minimal
                    icon={showApprovers ? "chevron-up" : "chevron-down"}
                    onClick={handleToggleApprovers}
                    text={showApprovers ? `Hide Approvers (${rpcData.approvers.length})` : `Show Approvers (${rpcData.approvers.length})`}
                    className="mb-2"
                  />
                  {showApprovers && (
                    <div className="space-y-1">
                      {rpcData.approvers.map((approver) => (
                        <div key={`approver-${approver.account_id}-${approver.when}`} className="text-sm flex items-center gap-2 font-mono text-xs">
                          <AccountName address={approver.account_id} />
                          <span className="ml-2 text-gray-600">(when: {approver.when ? (
                            <a
                              href={`https://3dpscan.xyz/#/blocks/${approver.when}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              {approver.when}
                            </a>
                          ) : "-"})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Outliers Section */}
              {rpcData.est_outliers && rpcData.est_outliers.length > 0 && (
                <div>
                  <Button
                    minimal
                    icon={showOutliers ? "chevron-up" : "chevron-down"}
                    onClick={handleToggleOutliers}
                    text={showOutliers ? `Hide Outliers (${rpcData.est_outliers.length})` : `Show Outliers (${rpcData.est_outliers.length})`}
                    className="mb-2"
                  />
                  {showOutliers && (
                    <div className="space-y-1">
                      {rpcData.est_outliers.map((address) => (
                        <div key={`outlier-${address}`} className="text-sm font-mono text-xs text-red-700 break-all">
                          <AccountName address={address} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Collapse>
      </Card>
      {/* Linked Assets Section */}
      <div className="w-full mt-4 flex flex-col items-end">
        {linkedAssetsLoading ? (
          <Spinner size={20} className="my-2" />
        ) : linkedAssets.length > 0 ? (
          linkedAssets.map(asset => (
            <Button
              key={asset.assetId}
              icon="dollar"
              className="mb-2"
              onClick={createAssetClickHandler(asset.assetId)}
            >
              View Asset #{asset.assetId}
            </Button>
          ))
        ) : (
          <span className="text-xs text-gray-400">No linked assets</span>
        )}
      </div>
      {selectedAssetId !== null && (
        <DialogAssetCard
          isOpen={selectedAssetId !== null}
          onClose={handleCloseSelectedAsset}
          assetId={selectedAssetId}
        />
      )}
      {showCreateAssetDialog && selectedPropertyForTokenization && (
        <DialogCreateAsset
          isOpen={showCreateAssetDialog}
          onClose={handleCloseCreateAssetDialog}
          prefillObjIdx={selectedPropertyForTokenization.objIdx}
          prefillPropIdx={selectedPropertyForTokenization.propIdx}
          objectProperties={rpcData?.prop}
        />
      )}
    </div>
  );
} 