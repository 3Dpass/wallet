import { Buffer } from "node:buffer";
import {
  Button,
  Card,
  Classes,
  Collapse,
  HTMLTable,
  Icon,
  type Intent,
  Popover,
  Spinner,
} from "@blueprintjs/core";
import { Canvas } from "@react-three/fiber";
import { lastSelectedAccountAtom } from "app/atoms";
import { useApi } from "app/components/Api";
import { AccountName } from "app/components/common/AccountName";
import { P3D_DECIMALS_FACTOR } from "app/utils/converter";
import { useAtom } from "jotai";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  Vector3,
  type WebGLRenderer,
} from "three";
import { OBJLoader } from "three-stdlib";
import ThreeDObject from "../block/ThreeDObject.client";
import DialogAssetCard from "../dialogs/DialogAssetCard";
import DialogCreateAsset from "../dialogs/DialogCreateAsset";

// Constants
const FETCH_DEBOUNCE_MS = 300; // 300ms debounce delay
const MAX_WEBGL_CONTEXTS = 8; // Limit for Safari compatibility

// WebGL Context Manager
class WebGLContextManager {
  private static instance: WebGLContextManager;
  private activeContexts: Map<
    string,
    { timestamp: number; dispose: () => void }
  > = new Map();

  static getInstance(): WebGLContextManager {
    if (!WebGLContextManager.instance) {
      WebGLContextManager.instance = new WebGLContextManager();
    }
    return WebGLContextManager.instance;
  }

  registerContext(id: string, dispose: () => void): void {
    // Remove oldest context if we're at the limit
    if (this.activeContexts.size >= MAX_WEBGL_CONTEXTS) {
      this.removeOldestContext();
    }

    this.activeContexts.set(id, {
      timestamp: Date.now(),
      dispose,
    });
  }

  unregisterContext(id: string): void {
    const context = this.activeContexts.get(id);
    if (context) {
      try {
        context.dispose();
      } catch (error) {
        console.warn("Error disposing WebGL context:", error);
      } finally {
        this.activeContexts.delete(id);
      }
    }
  }

  private removeOldestContext(): void {
    let oldestId: string | null = null;
    let oldestTime = Number.POSITIVE_INFINITY;

    for (const [id, context] of this.activeContexts.entries()) {
      if (context.timestamp < oldestTime) {
        oldestTime = context.timestamp;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.unregisterContext(oldestId);
    }
  }

  getContextCount(): number {
    return this.activeContexts.size;
  }
}

// Global context manager instance
const contextManager = WebGLContextManager.getInstance();

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
};

// Type for object state
type ObjectState = Record<string, number | string>;

// Type for object data as returned from api.query.poScan.objects(u32)
interface ObjectData {
  state?: ObjectState;
  isPrivate?: boolean;
  whenCreated?: number;
  whenApproved?: number | null;
  numApprovals?: number;
  owner?: string;
  compressed_with?: string | null;
  category?: { Objects3D: string } | null;
  is_replica?: boolean;
  original_obj?: number | null;
  sn_hash?: number | null;
  inspector?: string | null;
  is_ownership_abdicated?: boolean;
  is_self_proved?: boolean;
  proof_of_existence?: string | null;
  ipfs_link?: string | null;
  fee_payer?: string;
  inspector_fee?: number;
  qc_timeout?: number;
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
  compressed_with?: string | null; // compression method used (e.g., Lzss) or null if not compressed
  category?: { Objects3D: string } | null; // the object category and algorithm preset
  is_private: boolean; // whether the object is private and requires permissions for replicas
  hashes: string[]; // the HASH ID submitted by user (ex. the top 10 hashes from Grid2d output)
  whenCreated: number; // the block number the object was created at
  whenApproved?: number | null; // the block number the object was approved at (null if not approved)
  owner: string; // P3D address - the object owner
  estimators: [string, number][]; // the list of Validators (P3D addresses), who voted for the object to pass the estimation threshold
  estOutliers: string[]; // the validators ruled out of vote, due to the weird processing time
  est_outliers?: string[]; // alternative field name for estOutliers
  approvers: Array<{
    account_id: string;
    when: number;
    proof: string;
  }>; // the list of block authors (miners) provided their judgement on the object authenticity
  numApprovals: number; // the number of confirmations ordered by user
  estRewards: number; // the validator share of rewards in minimum indivisible units "Crumbs"
  authorRewards: number; // the block author share of rewards in minimum indivisible units "Crumbs"
  est_rewards?: number; // alternative field name for estRewards
  author_rewards?: number; // alternative field name for authorRewards
  prop: Array<{
    propIdx: number;
    maxValue: number;
  }>; // the list of the object properties (inherent to the object)
  is_replica?: boolean; // whether this object is a replica of another object
  original_obj?: number | null; // the object index of the original object if this is a replica (null if not a replica)
  sn_hash?: number | null; // serial number hash for replicas (null if not a replica)
  inspector?: string | null; // the inspector assigned for QC inspection (null if not under QC)
  is_ownership_abdicated?: boolean; // whether object ownership has been abdicated (irreversible)
  is_self_proved?: boolean; // whether this object is self-proved (skips estimation/approval process)
  proof_of_existence?: string | null; // hash proving the object's existence (null if not self-proved)
  ipfs_link?: string | null; // IPFS link to the object or related data (null if not provided)
  fee_payer?: string; // the account that will be charged for verification fees
  inspector_fee?: number; // inspector fee reserved for QC inspection (in Crumbs)
  qc_timeout?: number; // custom QC timeout in blocks (5-100,000, default from configuration)
}

// Type for state info return value
type StateInfo = {
  label: string;
  icon: string;
  intent: Intent;
};

// Type for Blueprint icons
type BlueprintIcon =
  | "help"
  | "confirm"
  | "error"
  | "time"
  | "chart"
  | "refresh"
  | "plus"
  | "info-sign"
  | "eye-open"
  | "shield"
  | "tick-circle"
  | "cross-circle";

function isOption(obj: unknown): obj is PolkadotOption {
  if (!obj || typeof obj !== "object") return false;
  const option = obj as Record<string, unknown>;
  return (
    typeof option.isSome === "boolean" && typeof option.unwrap === "function"
  );
}

// Helper function to safely get human-readable data from an Option
function getOptionValue<T>(
  option: PolkadotOption<T>
): T | Record<string, unknown> {
  if (option.toHuman && typeof option.toHuman === "function") {
    return option.toHuman();
  }
  if (option.toJSON && typeof option.toJSON === "function") {
    return option.toJSON();
  }
  return option.unwrap();
}

// Helper function to safely convert AnyJson to Record<string, unknown>
function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function ObjectDetailsTable({
  rpcData,
  formatRewards,
  showEstimators,
  handleToggleEstimators,
  showApprovers,
  handleToggleApprovers,
  showOutliers,
  handleToggleOutliers,
}: {
  rpcData: RpcObjectData;
  formatRewards: (amount: number) => string;
  showEstimators: boolean;
  handleToggleEstimators: () => void;
  showApprovers: boolean;
  handleToggleApprovers: () => void;
  showOutliers: boolean;
  handleToggleOutliers: () => void;
}) {
  // Build array of rows to avoid whitespace issues
  const rows = [
    <tr key="estimator-rewards">
      <td className="shadow-none font-medium pr-4">Estimator Rewards</td>
      <td className="shadow-none">
        {formatRewards(rpcData.estRewards ?? rpcData.est_rewards)}
      </td>
    </tr>,
    <tr key="author-rewards">
      <td className="shadow-none font-medium pr-4">Author Rewards</td>
      <td className="shadow-none">
        {formatRewards(rpcData.authorRewards ?? rpcData.author_rewards)}
      </td>
    </tr>,
  ];

  if (rpcData.compressed_with) {
    rows.push(
      <tr key="compression">
        <td className="shadow-none font-medium pr-4">Compression</td>
        <td className="shadow-none">{rpcData.compressed_with}</td>
      </tr>
    );
  }

  if (rpcData.is_replica) {
    rows.push(
      <tr key="replica-info">
        <td className="shadow-none font-medium pr-4">Replica Info</td>
        <td className="shadow-none">
          <div className="space-y-1">
            <div>Original Object: {rpcData.original_obj || "N/A"}</div>
            {rpcData.sn_hash && <div>Serial Number Hash: {rpcData.sn_hash}</div>}
          </div>
        </td>
      </tr>
    );
  }

  if (rpcData.inspector) {
    rows.push(
      <tr key="inspector">
        <td className="shadow-none font-medium pr-4">Inspector</td>
        <td className="shadow-none">
          <AccountName address={rpcData.inspector} />
        </td>
      </tr>
    );
  }

  if (rpcData.is_ownership_abdicated) {
    rows.push(
      <tr key="ownership">
        <td className="shadow-none font-medium pr-4">Ownership</td>
        <td className="shadow-none text-orange-600">Abdicated (Irreversible)</td>
      </tr>
    );
  }

  if (rpcData.is_self_proved) {
    rows.push(
      <tr key="self-proved">
        <td className="shadow-none font-medium pr-4">Self Proved</td>
        <td className="shadow-none text-blue-600">Yes</td>
      </tr>
    );
  }

  if (rpcData.proof_of_existence) {
    rows.push(
      <tr key="proof-of-existence">
        <td className="shadow-none font-medium pr-4">Proof of Existence</td>
        <td className="shadow-none font-mono text-xs break-all">
          {rpcData.proof_of_existence}
        </td>
      </tr>
    );
  }

  if (rpcData.ipfs_link) {
    rows.push(
      <tr key="ipfs-link">
        <td className="shadow-none font-medium pr-4">IPFS Link</td>
        <td className="shadow-none">
          <a
            href={rpcData.ipfs_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline break-all"
          >
            {rpcData.ipfs_link}
          </a>
        </td>
      </tr>
    );
  }

  if (rpcData.fee_payer) {
    rows.push(
      <tr key="fee-payer">
        <td className="shadow-none font-medium pr-4">Fee Payer</td>
        <td className="shadow-none">
          <AccountName address={rpcData.fee_payer} />
        </td>
      </tr>
    );
  }

  if (rpcData.inspector_fee) {
    rows.push(
      <tr key="inspector-fee">
        <td className="shadow-none font-medium pr-4">Inspector Fee</td>
        <td className="shadow-none">
          {formatRewards(rpcData.inspector_fee)}
        </td>
      </tr>
    );
  }

  if (rpcData.qc_timeout) {
    rows.push(
      <tr key="qc-timeout">
        <td className="shadow-none font-medium pr-4">QC Timeout</td>
        <td className="shadow-none">{rpcData.qc_timeout} blocks</td>
      </tr>
    );
  }

  return (
    <div className="space-y-4 pt-4 border-t">
      <HTMLTable className="w-full" striped>
        <tbody>
          {rows}
        </tbody>
      </HTMLTable>
      {rpcData.estimators.length > 0 && rpcData.hashes.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Button
              minimal
              icon={showEstimators ? "chevron-up" : "chevron-down"}
              onClick={handleToggleEstimators}
              text={
                showEstimators
                  ? `Hide Estimators (${rpcData.estimators.length})`
                  : `Show Estimators (${rpcData.estimators.length})`
              }
              className="mb-2"
            />
            {showEstimators && (
              <div className="space-y-1 mt-2">
                {rpcData.estimators
                  .sort(([, a], [, b]) => a - b) // Sort by numeric value (ascending)
                  .map(([account, value]) => (
                    <div
                      key={`estimator-${account}-${value}`}
                      className="text-sm flex items-center gap-2 font-mono text-xs"
                    >
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
            text={
              showEstimators
                ? `Hide Estimators (${rpcData.estimators.length})`
                : `Show Estimators (${rpcData.estimators.length})`
            }
            className="mb-2"
          />
          {showEstimators && (
            <div className="space-y-1 mt-2">
              {rpcData.estimators
                .sort(([, a], [, b]) => a - b) // Sort by numeric value (ascending)
                .map(([account, value]) => (
                  <div
                    key={`estimator-${account}-${value}`}
                    className="text-sm flex items-center gap-2 font-mono text-xs"
                  >
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
            text={
              showApprovers
                ? `Hide Approvers (${rpcData.approvers.length})`
                : `Show Approvers (${rpcData.approvers.length})`
            }
            className="mb-2"
          />
          {showApprovers && (
            <div className="space-y-1">
              {rpcData.approvers.map((approver) => (
                <div
                  key={`approver-${approver.account_id}-${approver.when}`}
                  className="text-sm flex items-center gap-2 font-mono text-xs"
                >
                  <AccountName address={approver.account_id} />
                  <span className="ml-2 text-gray-600">
                    (when:{" "}
                    {approver.when ? (
                      <a
                        href={`https://3dpscan.xyz/#/blocks/${approver.when}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {approver.when}
                      </a>
                    ) : (
                      "-"
                    )}
                    )
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Outliers Section */}
      {(() => {
        const outliers = rpcData.estOutliers || rpcData.est_outliers;
        return outliers && outliers.length > 0;
      })() && (
        <div>
          <Button
            minimal
            icon={showOutliers ? "chevron-up" : "chevron-down"}
            onClick={handleToggleOutliers}
            text={
              showOutliers
                ? `Hide Outliers (${(rpcData.estOutliers || rpcData.est_outliers || []).length})`
                : `Show Outliers (${(rpcData.estOutliers || rpcData.est_outliers || []).length})`
            }
            className="mb-2"
          />
          {showOutliers && (
            <div className="space-y-1">
              {(() => {
                const outliers = rpcData.estOutliers || rpcData.est_outliers || [];
                return outliers;
              })().map((outlierAddress: string, index: number) => {
                // Look up the outlier in the estimators list to get the time
                const estimatorEntry = rpcData.estimators.find(([address]) => address === outlierAddress);
                const time = estimatorEntry ? estimatorEntry[1] : 0;
                
                return (
                  <div
                    key={`outlier-${outlierAddress}-${index}`}
                    className="text-sm font-mono text-xs text-red-700 break-all"
                  >
                    <AccountName address={outlierAddress} />
                    {time > 0 && <span className="ml-2 text-gray-600">({time} ms)</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ObjectPreview({
  mesh,
  objString,
  objectIndex,
  rpcData,
  isLoading,
  previewReady,
  t,
}: {
  mesh: Mesh | null;
  objString: string | null;
  objectIndex: number;
  rpcData: RpcObjectData | null;
  isLoading: boolean;
  previewReady: boolean;
  t: (key: string) => string;
}) {
  const contextId = useMemo(() => `object-${objectIndex}`, [objectIndex]);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const disposedRef = useRef(false);
  
  // Type for WebGL renderer with custom cleanup function
  interface WebGLRendererWithCleanup extends WebGLRenderer {
    __cleanupListeners?: () => void;
  }

  // Determine why preview failed
  const getPreviewFailureReason = () => {
    if (isLoading || !previewReady) return null;
    if (!objString) return "No OBJ data available";
    if (objString.trim().length === 0) return "Empty OBJ data";
    if (!objString.includes("v ") && !objString.includes("f "))
      return "Invalid OBJ format";
    if (!mesh)
      return "Failed to parse OBJ geometry (may have malformed vertex normals)";
    if (!mesh.geometry) return "No geometry in mesh";
    if (!mesh.geometry.attributes?.position) return "No vertex data";
    if (mesh.geometry.attributes.position.count === 0)
      return "No vertices in geometry";
    return null;
  };

  const failureReason = getPreviewFailureReason();

  // Cleanup function for WebGL context (only disposes the renderer, not the context manager)
  const disposeRenderer = useCallback(() => {
    if (disposedRef.current) return; // Prevent multiple disposals
    disposedRef.current = true;
    
    if (rendererRef.current) {
      try {
        // Clean up event listeners first
        const rendererWithCleanup = rendererRef.current as WebGLRendererWithCleanup;
        if (rendererWithCleanup.__cleanupListeners) {
          rendererWithCleanup.__cleanupListeners();
        }
        
        rendererRef.current.dispose();
        rendererRef.current = null;
      } catch (error) {
        console.warn("Error disposing renderer:", error);
      }
    }
  }, []);

  // Separate cleanup function for context manager
  const disposeContext = useCallback(() => {
    disposeRenderer();
    contextManager.unregisterContext(contextId);
  }, [contextId, disposeRenderer]);

  // Handle Canvas creation
  const handleCanvasCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    disposedRef.current = false; // Reset disposal flag for new renderer
    rendererRef.current = gl;
    
    // Add context loss handling
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      console.warn('WebGL context lost for object', objectIndex);
      event.preventDefault();
    };
    
    const handleContextRestored = () => {
      console.log('WebGL context restored for object', objectIndex);
    };
    
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    
    // Store cleanup function
    const glWithCleanup = gl as WebGLRendererWithCleanup;
    glWithCleanup.__cleanupListeners = () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [objectIndex]);

  // Register context when component mounts
  useEffect(() => {
    if (mesh?.geometry && !failureReason) {
      contextManager.registerContext(contextId, disposeRenderer);
    }

    return () => {
      disposeContext();
    };
  }, [contextId, mesh?.geometry, failureReason, disposeRenderer, disposeContext]);

  return (
    <div className="md:w-80 flex-shrink-0 flex items-center justify-center overflow-hidden h-[260px] relative w-full md:w-80">
      {isLoading || !previewReady ? (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <Spinner size={24} />
          <span className="text-gray-400 mt-2">{t("object_card.loading")}</span>
        </div>
      ) : mesh?.geometry && !failureReason ? (
        <>
          <Canvas
            key={contextId}
            camera={{ fov: 30, near: 0.1, far: 1000, position: [0, 0, 2] }}
            onCreated={handleCanvasCreated}
            style={{ background: "transparent" }}
          >
            <Suspense fallback={<Spinner size={24} />}>
              <ThreeDObject geometry={mesh.geometry} />
            </Suspense>
          </Canvas>
          {objString && (
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <a
                className={Classes.BUTTON}
                href={`data:text/plain;base64,${Buffer.from(objString).toString("base64")}`}
                download={`3dpass-object-${objectIndex}.obj`}
                title={t("assets.download_obj_file")}
              >
                <Icon icon="download" />
              </a>
              <Popover
                content={
                  <div className="p-4">
                    {rpcData?.hashes && rpcData.hashes.length > 0 && (
                      <>
                        <div className="font-mono mb-2">
                          Hash ID Objects3D: Grid2dLow
                        </div>
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
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <Icon icon="error" intent="warning" size={24} className="mb-2" />
          <span className="text-gray-400 text-sm mb-1">
            {t("object_card.no_preview")}
          </span>
          {failureReason && (
            <span className="text-gray-500 text-xs max-w-full break-words">
              {failureReason}
            </span>
          )}
          {objString && (
            <div className="mt-2">
              <a
                className={`${Classes.BUTTON} text-xs`}
                href={`data:text/plain;base64,${Buffer.from(objString).toString("base64")}`}
                download={`3dpass-object-${objectIndex}.obj`}
                title={t("assets.download_obj_file")}
              >
                <Icon icon="download" size={12} />
                <span className="ml-1">{t("assets.download_obj_file")}</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Custom OBJ parser that handles malformed data (used as fallback only)
const parseOBJRobust = (objString: string): BufferGeometry | null => {
  try {
    const lines = objString.split("\n");
    const vertices: Vector3[] = [];
    const faces: number[][] = [];
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) continue;
      const parts = trimmedLine.split(/\s+/);
      if (parts.length === 0) continue;
      const type = parts[0];
      try {
        switch (type) {
          case "v":
            if (parts.length >= 4) {
              const vertexX = Number.parseFloat(parts[1]);
              const vertexY = Number.parseFloat(parts[2]);
              const vertexZ = Number.parseFloat(parts[3]);
              if (
                !Number.isNaN(vertexX) &&
                !Number.isNaN(vertexY) &&
                !Number.isNaN(vertexZ)
              ) {
                vertices.push(new Vector3(vertexX, vertexY, vertexZ));
              }
            }
            break;
          case "vn":
            // Only warn for malformed normals if fallback parser is used
            if (parts.length < 4) {
              continue;
            }
            break;
          case "f":
            if (parts.length >= 4) {
              const face: number[] = [];
              for (let j = 1; j < parts.length; j++) {
                const vertexPart = parts[j].split("/")[0];
                const vertexIndex = Number.parseInt(vertexPart);
                if (!Number.isNaN(vertexIndex) && vertexIndex > 0) {
                  face.push(vertexIndex - 1);
                }
              }
              if (face.length >= 3) {
                faces.push(face);
              }
            }
            break;
        }
      } catch {}
    }
    if (vertices.length === 0 || faces.length === 0) {
      return null;
    }
    const positions: number[] = [];
    for (const face of faces) {
      if (face.length === 3) {
        for (const vertexIndex of face) {
          if (vertexIndex < vertices.length) {
            const vertex = vertices[vertexIndex];
            positions.push(vertex.x, vertex.y, vertex.z);
          }
        }
      } else if (face.length > 3) {
        for (let j = 1; j < face.length - 1; j++) {
          const indices = [face[0], face[j], face[j + 1]];
          for (const vertexIndex of indices) {
            if (vertexIndex < vertices.length) {
              const vertex = vertices[vertexIndex];
              positions.push(vertex.x, vertex.y, vertex.z);
            }
          }
        }
      }
    }
    if (positions.length === 0) {
      return null;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  } catch (_error) {
    return null;
  }
};

export default function ObjectCard({
  objectIndex,
  objectData,
  inDialog = false,
}: ObjectCardProps & { inDialog?: boolean }) {
  const api = useApi();
  const { t } = useTranslation();
  const [objString, setObjString] = useState<string | null>(null);
  const [rpcData, setRpcData] = useState<RpcObjectData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEstimators, setShowEstimators] = useState(false);
  const [showApprovers, setShowApprovers] = useState(false);
  const [showOutliers, setShowOutliers] = useState(false);
  const [propertyDefs, setPropertyDefs] = useState<
    Record<number, { name: string; maxValue: number }>
  >({});
  const [linkedAssets, setLinkedAssets] = useState<LinkedAsset[]>([]);
  const [linkedAssetsLoading, setLinkedAssetsLoading] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [showCreateAssetDialog, setShowCreateAssetDialog] = useState(false);
  const [selectedPropertyForTokenization, setSelectedPropertyForTokenization] =
    useState<{ objIdx: number; propIdx: number } | null>(null);
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);

  // Request cancellation and debouncing refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentObjectIndexRef = useRef<number | null>(null);

  // Helper function to convert array to string with chunked processing
  const arrayToString = (arr: number[]): string => {
    const CHUNK_SIZE = 0x8000; // 32,768
    let result = "";
    for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
      result += String.fromCharCode.apply(
        null,
        arr.slice(i, i + CHUNK_SIZE)
      );
    }
    return result;
  };

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

  const handleTokenizeProperty = useCallback(
    (objIdx: number, propIdx: number) => {
      setSelectedPropertyForTokenization({ objIdx, propIdx });
      setShowCreateAssetDialog(true);
    },
    []
  );

  const createAssetClickHandler = useCallback(
    (assetId: number) => {
      return () => handleSetSelectedAssetId(assetId);
    },
    [handleSetSelectedAssetId]
  );

  const createTokenizePropertyClickHandler = useCallback(
    (objIdx: number, propIdx: number) => {
      return () => handleTokenizeProperty(objIdx, propIdx);
    },
    [handleTokenizeProperty]
  );

  // Memoized functions for JSX to avoid arrow functions
  const checkLinkedAsset = useCallback(
    (asset: LinkedAsset, objIdx: number, propIdx: number) => {
      const objDetails = asset.details.objDetails as AssetDetails["objDetails"];
      if (!objDetails) return false;
      const assetObjIdx =
        typeof objDetails.objIdx === "string"
          ? Number.parseInt(objDetails.objIdx, 10)
          : objDetails.objIdx;
      const assetPropIdx =
        typeof objDetails.propIdx === "string"
          ? Number.parseInt(objDetails.propIdx, 10)
          : objDetails.propIdx;

      return assetObjIdx === objIdx && assetPropIdx === propIdx;
    },
    []
  );

  const renderProperty = useCallback(
    (p: { propIdx: number; maxValue: number }) => {
      const def = propertyDefs[Number(p.propIdx)];
      const name = def?.name || `Property ${p.propIdx}`;
      const max = def?.maxValue ?? 1;
      // Check if this property has a linked asset
      const hasLinkedAsset = linkedAssets.some((asset) =>
        checkLinkedAsset(asset, objectIndex, Number(p.propIdx))
      );
      return (
        <div key={p.propIdx} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasLinkedAsset && <Icon icon="dollar" intent="success" />}
            <span
              className={hasLinkedAsset ? "text-green-300 font-semibold" : ""}
            >
              {name}: {max}
            </span>
          </div>
          {!hasLinkedAsset && rpcData?.owner === selectedAccount && (
            <Button
              icon="dollar"
              text={t("assets.tokenize")}
              className={Classes.BUTTON}
              onClick={createTokenizePropertyClickHandler(
                objectIndex,
                Number(p.propIdx)
              )}
            />
          )}
        </div>
      );
    },
    [
      propertyDefs,
      linkedAssets,
      objectIndex,
      rpcData?.owner,
      selectedAccount,
      createTokenizePropertyClickHandler,
      checkLinkedAsset,
      t,
    ]
  );

  const renderLinkedAsset = useCallback(
    (asset: LinkedAsset) => (
      !inDialog && (
        <Button
          key={asset.assetId}
          icon="dollar"
          className="mb-2"
          onClick={createAssetClickHandler(asset.assetId)}
        >
          {t("object_card.view_asset")} #{asset.assetId}
        </Button>
      )
    ),
    [createAssetClickHandler, t, inDialog]
  );

  // Main fetch function with cancellation
  const fetchObj = useCallback(
    async (targetObjectIndex: number) => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      if (!api) {
        if (
          !signal.aborted &&
          currentObjectIndexRef.current === targetObjectIndex
        ) {
          setObjString(null);
          setRpcData(null);
          setIsLoading(false);
        }
        return;
      }

      // Set loading state
      if (
        !signal.aborted &&
        currentObjectIndexRef.current === targetObjectIndex
      ) {
        setIsLoading(true);
      }

      try {
        // @ts-expect-error - poscan is a custom RPC method not in standard Polkadot types
        const result = await api.rpc.poscan.getPoscanObject(targetObjectIndex);

        // Check if request was cancelled
        if (
          signal.aborted ||
          currentObjectIndexRef.current !== targetObjectIndex
        )
          return;

        let patchedResult = result;
        // Normalize estOutliers field names
        if (result && !result.estOutliers && result.est_outliers) {
          patchedResult = { ...result, estOutliers: result.est_outliers };
        }
        if (patchedResult && !patchedResult.prop && patchedResult.props) {
          patchedResult = { ...patchedResult, prop: patchedResult.props };
        }
        // Normalize rewards field names
        if (patchedResult && !patchedResult.estRewards && patchedResult.est_rewards !== undefined) {
          patchedResult = { ...patchedResult, estRewards: patchedResult.est_rewards };
        }
        if (patchedResult && !patchedResult.authorRewards && patchedResult.author_rewards !== undefined) {
          patchedResult = { ...patchedResult, authorRewards: patchedResult.author_rewards };
        }
        if (patchedResult?.prop && Array.isArray(patchedResult.prop)) {
          const normalizedProps = patchedResult.prop.map(
            (p: PropertyObject) => {
              if (p && typeof p === "object") {
                return {
                  propIdx: p.propIdx ?? p.prop_idx ?? p.PropIdx ?? "",
                  maxValue: p.maxValue ?? p.max_value ?? p.MaxValue ?? "",
                };
              }
              return p;
            }
          );
          if (
            !normalizedProps.some(
              (p: { propIdx: string | number }) => Number(p.propIdx) === 1
            )
          ) {
            normalizedProps.push({ propIdx: 1, maxValue: 0 });
          }
          patchedResult = {
            ...patchedResult,
            prop: normalizedProps,
          };
        }
        if (patchedResult?.obj && Array.isArray(patchedResult.obj)) {
          const str = arrayToString(patchedResult.obj);

          // Check if the string contains literal "\n" text (not actual newlines)
          const literalNewlineCount = (str.match(/\\n/g) || []).length;

          // Preprocess the string to handle literal \n and other escape sequences
          let processedStr = str;
          if (literalNewlineCount > 0) {
            processedStr = str.replace(/\\n/g, "\n");
          }

          // Also handle other common escape sequences that might be in the data
          processedStr = processedStr.replace(/\\r/g, "\r");
          processedStr = processedStr.replace(/\\t/g, "\t");

          if (
            !signal.aborted &&
            currentObjectIndexRef.current === targetObjectIndex
          ) {
            setObjString(processedStr);
            setRpcData(patchedResult as RpcObjectData);
          }
        } else {
          if (
            !signal.aborted &&
            currentObjectIndexRef.current === targetObjectIndex
          ) {
            setObjString(null);
            setRpcData(null);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch object ${targetObjectIndex}:`, error);
        if (
          !signal.aborted &&
          currentObjectIndexRef.current === targetObjectIndex
        ) {
          setObjString(null);
          setRpcData(null);
        }
      }
    },
    [api]
  );

  // Debounced fetch function
  const debouncedFetchObj = useCallback(
    (targetObjectIndex: number) => {
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
    },
    [fetchObj]
  );

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
    if (typeof objString !== "string" || objString.trim().length === 0) {
      return null;
    }
    if (!objString.includes("v ") && !objString.includes("f ")) {
      return null;
    }

    // Safari-specific optimization: limit processing for very large objects
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const maxVertices = isSafari ? 50000 : 100000; // Lower limit for Safari

    // Try standard OBJLoader first
    try {
      const loader = new OBJLoader();
      const parsed = loader.parse(objString);
      if (!parsed || !parsed.children || parsed.children.length === 0) {
        throw new Error("No children");
      }
      const firstChild = parsed.children[0];
      if (!firstChild) {
        throw new Error("No first child");
      }
      if (!(firstChild as Mesh).isMesh) {
        throw new Error("Not a mesh");
      }
      if (!(firstChild as Mesh).geometry) {
        throw new Error("No geometry");
      }
      const geometry = (firstChild as Mesh).geometry;
      if (!geometry.attributes || !geometry.attributes.position) {
        throw new Error("No position attributes");
      }
      const positionCount = geometry.attributes.position.count;
      if (positionCount === 0) {
        throw new Error("No vertices");
      }

      // Check vertex count limit for Safari
      if (isSafari && positionCount > maxVertices) {
        console.warn(
          `Object ${objectIndex} has ${positionCount} vertices, limiting for Safari compatibility`
        );
        // For Safari, we'll still show the object but warn about potential performance issues
      }

      return firstChild as Mesh;
    } catch (_e) {
      // Try robust parser as fallback
      try {
        const geometry = parseOBJRobust(objString);
        if (
          geometry?.attributes?.position &&
          geometry.attributes.position.count > 0
        ) {
          return new Mesh(geometry);
        }
      } catch (_robustError) {
        // Silent fallback - both parsers failed
      }
      return null;
    }
  }, [objString, objectIndex]);

  // Track when mesh is ready
  useEffect(() => {
    setPreviewReady(!!mesh);
  }, [mesh]);

  // State row as array of React nodes for proper formatting and links
  const stateRow = objectData?.state
    ? Object.entries(objectData.state).map(([k, v], idx, arr) => {
        let node: React.ReactNode;
        if (typeof v === "number") {
          const label =
            k === "notApproved"
              ? "Disapproved"
              : k.charAt(0).toUpperCase() + k.slice(1);
          node = (
            <>
              {label}:{" "}
              <a
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
            {idx < arr.length - 1 ? ", " : null}
          </React.Fragment>
        );
      })
    : "-";

  // Helper function to get state info
  const getStateInfo = (): StateInfo => {
    if (!objectData?.state)
      return {
        label: "Unknown",
        icon: "help" as BlueprintIcon,
        intent: "none",
      };

    const stateKeys = Object.keys(objectData.state);
    if (stateKeys.length === 0)
      return {
        label: "Unknown",
        icon: "help" as BlueprintIcon,
        intent: "none",
      };

    // Check for QC-related statuses first (they might contain additional info)
    if (stateKeys.includes("qcInspecting")) {
      return {
        label: "QC Inspecting",
        icon: "eye-open" as BlueprintIcon,
        intent: "warning",
      };
    }
    if (stateKeys.includes("qcPassed")) {
      return {
        label: "QC Passed",
        icon: "tick-circle" as BlueprintIcon,
        intent: "success",
      };
    }
    if (stateKeys.includes("qcRejected")) {
      return {
        label: "QC Rejected",
        icon: "cross-circle" as BlueprintIcon,
        intent: "danger",
      };
    }
    if (stateKeys.includes("selfProved")) {
      return {
        label: "Self Proved",
        icon: "shield" as BlueprintIcon,
        intent: "primary",
      };
    }
    if (stateKeys.includes("approved")) {
      return {
        label: "Approved",
        icon: "confirm" as BlueprintIcon,
        intent: "success",
      };
    }
    if (stateKeys.includes("notApproved")) {
      return {
        label: "Disapproved",
        icon: "error" as BlueprintIcon,
        intent: "danger",
      };
    }
    if (stateKeys.includes("approving")) {
      return {
        label: "Approving",
        icon: "time" as BlueprintIcon,
        intent: "warning",
      };
    }
    if (stateKeys.includes("estimated")) {
      return {
        label: "Estimated",
        icon: "chart" as BlueprintIcon,
        intent: "primary",
      };
    }
    if (stateKeys.includes("estimating")) {
      return {
        label: "Estimating",
        icon: "refresh" as BlueprintIcon,
        intent: "warning",
      };
    }
    if (stateKeys.includes("created")) {
      return {
        label: "Created",
        icon: "plus" as BlueprintIcon,
        intent: "none",
      };
    }

    const firstState = stateKeys[0];
    return {
      label: firstState.charAt(0).toUpperCase() + firstState.slice(1),
      icon: "info-sign" as BlueprintIcon,
      intent: "none",
    };
  };

  const stateInfo = getStateInfo();

  // Format rewards
  const formatRewards = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) {
      return "0.000000 P3D";
    }
    
    const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
    
    if (isNaN(numericAmount) || !isFinite(numericAmount)) {
      return "0.000000 P3D";
    }
    
    return `${(numericAmount / P3D_DECIMALS_FACTOR).toFixed(6)} P3D`;
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
          let name = "";
          let maxValue = 1;
          if (
            opt &&
            typeof opt === "object" &&
            "isSome" in opt &&
            opt.isSome &&
            "unwrap" in opt
          ) {
            const option = opt as { unwrap: () => unknown };
            const unwrapped = option.unwrap();
            const prop =
              unwrapped &&
              typeof unwrapped === "object" &&
              "toJSON" in unwrapped
                ? (
                    unwrapped as { toJSON: () => Record<string, unknown> }
                  ).toJSON()
                : (unwrapped as Record<string, unknown>);
            if (typeof prop.name === "string") {
              name = prop.name;
            } else if (
              prop.name &&
              typeof prop.name === "object" &&
              (prop.name as Record<string, unknown>).Raw
            ) {
              name = (prop.name as Record<string, unknown>).Raw as string;
            }
            if (typeof name === "string" && name.startsWith("0x")) {
              try {
                const hex = name.slice(2);
                let str = "";
                for (let j = 0; j < hex.length; j += 2) {
                  str += String.fromCharCode(
                    Number.parseInt(hex.substr(j, 2), 16)
                  );
                }
                name = str;
              } catch (_e) {
                // ignore decoding errors, fallback to original hex string
              }
            }
            maxValue = (prop.maxValue ?? prop.max_value ?? 1) as number;
          } else {
            name = `Property ${propIdxs[i]}`;
            maxValue = 1;
          }
          defs[propIdxs[i]] = { name, maxValue };
        });
        setPropertyDefs(defs);
      } catch (_e) {
        setPropertyDefs({});
      }
    }
    fetchPropertyNames();
  }, [api, rpcData]);

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
            const objIdxNum =
              typeof details.objDetails.objIdx === "string"
                ? Number.parseInt(details.objDetails.objIdx, 10)
                : details.objDetails.objIdx;
            if (objIdxNum === objectIndex) {
              linked.push({ assetId, details });
            }
          }
        }

        // Only update state if request wasn't cancelled
        if (!signal.aborted && mounted) {
          setLinkedAssets(linked);
        }
      } catch (_e) {
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

  // Add a useEffect to set isLoading to false only after objString is set (or null) and mesh parsing has run
  useEffect(() => {
    // Only stop loading after objString is set (or null) and mesh parsing has run
    // This ensures the spinner stays until the preview is ready
    if (objString !== undefined) {
      setIsLoading(false);
    }
  }, [objString]);

  return (
    <div className="w-full">
      <Card className="w-full hover:shadow-lg transition-shadow duration-200 mb-4 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-0 mb-4 items-start">
          {/* Preview Left (fixed width) */}
          <ObjectPreview
            mesh={mesh}
            objString={objString}
            objectIndex={objectIndex}
            rpcData={rpcData}
            isLoading={isLoading}
            previewReady={previewReady}
            t={t}
          />
          {/* Info Right (flex-1) */}
          <div className="flex-1 flex flex-col justify-start p-6 min-w-0 w-full md:w-auto">
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Object {objectIndex}
                  {stateInfo.icon && stateInfo.icon !== "help" && (
                    <Icon
                      icon={stateInfo.icon as BlueprintIcon}
                      intent={stateInfo.intent}
                      title={stateInfo.label}
                      className="ml-2"
                    />
                  )}
                </h2>
                <Button
                  minimal
                  icon={isExpanded ? "chevron-up" : "chevron-down"}
                  onClick={handleToggleExpanded}
                  text={
                    isExpanded
                      ? t("assets.hide_details")
                      : t("assets.show_details")
                  }
                />
              </div>
              <HTMLTable className="w-full mb-2" striped>
                <tbody>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                      State
                    </td>
                    <td className="font-medium">{stateRow}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                      Rights
                    </td>
                    <td className="font-medium">
                      {objectData?.isPrivate ? "Private" : "Public"}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                      Created
                    </td>
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
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                      Approvals
                    </td>
                    <td className="font-medium">
                      {objectData?.numApprovals ?? "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                      Owner
                    </td>
                    <td className="font-medium">
                      {rpcData?.owner ? (
                        <div className="flex items-center gap-2">
                          <AccountName address={rpcData.owner} />
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                      Properties
                    </td>
                    <td className="font-medium">
                      {(rpcData?.prop?.length ?? 0) > 0 ? (
                        <div className="space-y-2">
                          {rpcData?.prop?.map(renderProperty)}
                        </div>
                      ) : (
                        "-"
                      )}
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
            <ObjectDetailsTable
              rpcData={rpcData}
              formatRewards={formatRewards}
              showEstimators={showEstimators}
              handleToggleEstimators={handleToggleEstimators}
              showApprovers={showApprovers}
              handleToggleApprovers={handleToggleApprovers}
              showOutliers={showOutliers}
              handleToggleOutliers={handleToggleOutliers}
            />
          )}
        </Collapse>
      </Card>
      {/* Linked Assets Section */}
      <div className="w-full mt-4 flex flex-col items-end">
        {linkedAssetsLoading ? (
          <Spinner size={20} className="my-2" />
        ) : linkedAssets.length > 0 ? (
          linkedAssets.map(renderLinkedAsset)
        ) : (
          <span className="text-xs text-gray-400">
            {t("object_card.no_linked_assets")}
          </span>
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
