import { Buffer } from "node:buffer";
import {
  Button,
  Card,
  Classes,
  Elevation,
  Icon,
  Popover,
} from "@blueprintjs/core";
import { Canvas } from "@react-three/fiber";
import { Link } from "@remix-run/react";
import { useAtomValue } from "jotai";
import { Suspense, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { bestNumberFinalizedAtom } from "../../atoms";
import TitledValue from "../common/TitledValue";
import type { IBlock } from "../types";
import ThreeDObject from "./ThreeDObject.client";

// Types for better type safety
interface DigestEngine {
  name: string;
  bytes: string;
  digestBytes: string;
}

interface BlockProps {
  block: IBlock;
}

// Helper component for rendering digest engines
const DigestEngineItem = ({
  engine,
  isLast,
  onCopy,
}: {
  engine: DigestEngine;
  isLast: boolean;
  onCopy: (bytes: string) => void;
}) => {
  const handleCopy = useCallback(() => {
    onCopy(engine.digestBytes);
  }, [onCopy, engine.digestBytes]);

  return (
    <div className="flex items-center gap-1">
      <strong>{engine.name}</strong>
      <Button
        icon="duplicate"
        minimal
        small
        onClick={handleCopy}
        className="p-1"
      />
      {!isLast && <span className="text-gray-600">,</span>}
    </div>
  );
};

// Helper component for rendering digest groups
const DigestGroup = ({
  title,
  engines,
  onCopy,
}: {
  title: string;
  engines: DigestEngine[];
  onCopy: (bytes: string) => void;
}) => {
  if (engines.length === 0) return null;

  const renderEngine = useCallback((engine: DigestEngine, index: number) => (
    <DigestEngineItem
      key={`${engine.name}-${engine.bytes}`}
      engine={engine}
      isLast={index === engines.length - 1}
      onCopy={onCopy}
    />
  ), [engines.length, onCopy]);

  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-600">{title}:</span>
      {engines.map(renderEngine)}
    </div>
  );
};

// Helper component for rendering seal and consensus engines
const SealAndConsensusGroup = ({
  sealEngines,
  consensusEngines,
  onCopy,
}: {
  sealEngines: DigestEngine[];
  consensusEngines: DigestEngine[];
  onCopy: (bytes: string) => void;
}) => {
  const hasSeal = sealEngines.length > 0;
  const hasConsensus = consensusEngines.length > 0;

  if (!hasSeal && !hasConsensus) return null;

  const renderSealEngine = useCallback((engine: DigestEngine, index: number) => (
    <DigestEngineItem
      key={`seal-${engine.name}-${engine.bytes}`}
      engine={engine}
      isLast={index === sealEngines.length - 1}
      onCopy={onCopy}
    />
  ), [sealEngines.length, onCopy]);

  const renderConsensusEngine = useCallback((engine: DigestEngine, index: number) => (
    <DigestEngineItem
      key={`consensus-${engine.name}-${engine.bytes}`}
      engine={engine}
      isLast={index === consensusEngines.length - 1}
      onCopy={onCopy}
    />
  ), [consensusEngines.length, onCopy]);

  return (
    <div className="flex items-center gap-1">
      {hasSeal && (
        <>
          <span className="text-gray-600">Seal:</span>
          {sealEngines.map(renderSealEngine)}
        </>
      )}
      {hasSeal && hasConsensus && <span className="text-gray-600">,</span>}
      {hasConsensus && (
        <>
          <span className="text-gray-600">Consensus:</span>
          {consensusEngines.map(renderConsensusEngine)}
        </>
      )}
    </div>
  );
};

// Helper component for rendering block status
const BlockStatus = ({
  blockNumber,
  isFinalized,
}: {
  blockNumber: number;
  isFinalized: boolean;
}) => {
  const { t } = useTranslation();

  if (isFinalized) {
    return (
      <>
        <Link
          to={`https://3dpscan.xyz/#/blocks/${blockNumber}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {blockNumber.toLocaleString()}
        </Link>{" "}
        <div className="small-title">✓ {t("root.lbl_finalized")}</div>
      </>
    );
  }

  return (
    <>
      {blockNumber.toLocaleString()}
      <div className="small-title">{t("root.lbl_block_not_finalized")}</div>
    </>
  );
};

// Helper component for rendering popover content
const BlockDetailsPopover = ({
  block,
  objectHashAlgo,
  onCopy,
}: {
  block: IBlock;
  objectHashAlgo: string;
  onCopy: (bytes: string) => void;
}) => {
  const { t } = useTranslation();
  const [showLogs, setShowLogs] = useState(false);

  const handleToggleLogs = useCallback(() => {
    setShowLogs(!showLogs);
  }, [showLogs]);

  const renderHash = useCallback((hash: string) => (
    <div key={hash}>{hash}</div>
  ), []);

  return (
    <div className="p-4">
      {block.blockHash && (
        <div className="font-mono mb-2 text-xs">
          {t("root.lbl_block_hash")} <br />
          <strong className="break-all">{block.blockHash}</strong>
        </div>
      )}
      {block.author && (
        <div className="font-mono mb-2 text-xs">
          {t("root.lbl_block_author")} <br />
          <strong>{block.author}</strong>
        </div>
      )}
      {block.timestamp && (
        <div className="font-mono mb-2 text-xs">
          {t("root.lbl_block_timestamp")} <br />
          <strong>{block.timestamp}</strong>
        </div>
      )}
      {block.digestGroups && (
        <div className="font-mono mb-2 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span>{t("root.lbl_logs")}</span>
            <Button
              minimal
              small
              icon={showLogs ? "chevron-up" : "chevron-down"}
              onClick={handleToggleLogs}
            />
          </div>
          {showLogs && (
            <div className="space-y-1">
              <DigestGroup
                title="PreRuntime"
                engines={block.digestGroups.preruntime}
                onCopy={onCopy}
              />
              <SealAndConsensusGroup
                sealEngines={block.digestGroups.seal}
                consensusEngines={block.digestGroups.consensus}
                onCopy={onCopy}
              />
              <DigestGroup
                title="Other"
                engines={block.digestGroups.other}
                onCopy={onCopy}
              />
            </div>
          )}
        </div>
      )}
      {block.totalBlockReward && (
        <div className="font-mono mb-2 text-xs">
          {t("root.lbl_total_block_reward")} <br />
          <strong>{block.totalBlockReward} P3D</strong>
        </div>
      )}
      {block.objectHashAlgo && (
        <div className="font-mono mb-2 text-xs">
          {t("root.lbl_object_hash_algo")} <strong>{objectHashAlgo}</strong>
        </div>
      )}
      <code className="block text-xs">
        {block.objectHashes.map(renderHash)}
      </code>
    </div>
  );
};

export default function Block({ block }: BlockProps) {
  const { t } = useTranslation();
  const bestNumberFinalized = useAtomValue(bestNumberFinalizedAtom);

  // Derived values
  const objectHashAlgo = Buffer.from(block.objectHashAlgo, "hex").toString(
    "utf8"
  );
  const blockNumber = block.block.header.number.toNumber();
  const isFinalized = blockNumber <= bestNumberFinalized;
  const objectBase64 = Buffer.from(block.objectObj).toString("base64");
  const downloadUrl = `data:text/plain;base64,${objectBase64}`;
  const downloadFilename = `3dpass-${block.block.header.number.toString()}.obj`;

  // Event handlers
  const handleCopyEngineBytes = useCallback(async (bytes: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(bytes);
      // You could add a toast notification here if you have a toaster
    } catch (error) {
      console.error("Failed to copy engine bytes:", error);
    }
  }, []);

  return (
    <Card elevation={Elevation.ZERO}>
      <div className="flex justify-between items-start">
        <TitledValue
          title={t("root.lbl_block")}
          value={
            <BlockStatus blockNumber={blockNumber} isFinalized={isFinalized} />
          }
        />
        <div className="flex gap-2">
          <a
            className={Classes.BUTTON}
            href={downloadUrl}
            download={downloadFilename}
          >
            <Icon icon="download" />
          </a>
          <Popover
            content={
              <BlockDetailsPopover
                block={block}
                objectHashAlgo={objectHashAlgo}
                onCopy={handleCopyEngineBytes}
              />
            }
          >
            <Button icon="info-sign" />
          </Popover>
        </div>
      </div>
      <div className="w-full h-[300px]">
        <Canvas
          camera={{
            fov: 30,
            near: 0.1,
            far: 1000,
            position: [0, 0, 2],
          }}
        >
          <Suspense fallback={null}>
            <ThreeDObject geometry={block.object3d.geometry} />
          </Suspense>
        </Canvas>
      </div>
    </Card>
  );
}
