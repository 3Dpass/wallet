import type { ApiPromise } from "@polkadot/api";
import { encodeAddress } from "@polkadot/keyring";
import type { Text } from "@polkadot/types";
import type { EventRecord, SignedBlock } from "@polkadot/types/interfaces";
import type { Mesh } from "three";
import * as THREE from "three";
import { OBJLoader } from "three-stdlib";
import type { IBlock } from "../components/types";
import { P3D_DECIMALS_FACTOR } from "./converter";

// Constants for blockchain data parsing
const ALGO_NAME_LENGTH = 32;
const OBJECT_HASH_LENGTH = 64;

// Types for better type safety
interface BlockMetadata {
  blockHash: string;
  author: string;
  seal: string;
  consensusEngine: string;
  digestGroups: IBlock["digestGroups"];
}

// Translation utility for console messages
const logWarning = (
  messageKey: string,
  error?: unknown,
  t?: (key: string) => string
): void => {
  const message = t ? t(`utils.errors.${messageKey}`) : messageKey;
  if (error) {
    console.warn(message, error);
  } else {
    console.warn(message);
  }
};

// Create a fallback mesh when 3D object loading fails
const createFallbackMesh = (): Mesh => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhongMaterial({ color: 0x666666 });
  return new THREE.Mesh(geometry, material);
};

// Helper function to safely decode engine name
const decodeEngineName = (engineId: {
  toUtf8(): string;
  toHex(): string;
}): string => {
  try {
    return engineId.toUtf8();
  } catch {
    return engineId.toHex();
  }
};

// Helper function to decode other digest engine name
const decodeOtherEngineName = (otherData: { toHex(): string }): string => {
  try {
    const firstThreeBytes = otherData.toHex().slice(0, 6);
    const bytes = new Uint8Array(
      firstThreeBytes
        .match(/.{1,2}/g)
        ?.map((byte) => Number.parseInt(byte, 16)) || []
    );
    return new TextDecoder().decode(bytes);
  } catch {
    return otherData.toHex().slice(0, 8);
  }
};

// Helper function to add engine to digest group if not already present
const addEngineToGroup = (
  group: IBlock["digestGroups"]["preruntime"],
  engineName: string,
  engineBytes: string,
  digestBytes: string
): void => {
  const existingEngine = group.find((engine) => engine.name === engineName);
  if (!existingEngine) {
    group.push({
      name: engineName,
      bytes: engineBytes,
      digestBytes,
    });
  }
};

// Extract additional block metadata from digest logs
const extractBlockMetadata = (
  block: SignedBlock["block"],
  api: ApiPromise,
  t?: (key: string) => string
): BlockMetadata => {
  const blockHash = block.header.hash.toHex();
  let author = "";
  let seal = "";
  const digestGroups: IBlock["digestGroups"] = {
    preruntime: [],
    seal: [],
    consensus: [],
    other: [],
  };

  // Process digest logs to extract metadata
  for (const log of block.header.digest.logs) {
    try {
      // Extract PreRuntime digest (contains author information)
      if (log.isPreRuntime) {
        const preRuntime = log.asPreRuntime;
        const engineId = preRuntime[0];
        const digestBytes = log.toHex();
        const engineName = decodeEngineName(engineId);

        addEngineToGroup(
          digestGroups.preruntime,
          engineName,
          engineId.toHex(),
          digestBytes
        );

        // Try to decode author from PreRuntime data
        const data = preRuntime[1];
        if (data && data.length >= 32) {
          try {
            const authorBytes = data.slice(0, 32);
            const ss58Format = api.registry.chainSS58;
            author = encodeAddress(authorBytes, ss58Format);
          } catch (error) {
            logWarning("failed_decode_author", error, t);
          }
        }
      }

      // Extract Seal digest (contains proof of work)
      if (log.isSeal) {
        const sealData = log.asSeal;
        seal = sealData[1].toHex();
        const digestBytes = log.toHex();
        const engineId = sealData[0];
        const engineName = decodeEngineName(engineId);

        addEngineToGroup(
          digestGroups.seal,
          engineName,
          engineId.toHex(),
          digestBytes
        );
      }

      // Extract Consensus digest (specific consensus engine logs)
      if (log.isConsensus) {
        const consensusData = log.asConsensus;
        const digestBytes = log.toHex();
        const engineId = consensusData[0];
        const engineName = decodeEngineName(engineId);

        // Only add consensus engines to consensus group from Consensus digest
        const isConsensusEngine =
          engineName === "fron" ||
          engineName === "posc" ||
          engineName === "psc2";
        if (isConsensusEngine) {
          addEngineToGroup(
            digestGroups.consensus,
            engineName,
            engineId.toHex(),
            digestBytes
          );
        }
      }

      // Extract Other digest
      if (log.isOther) {
        const otherData = log.asOther;
        const digestBytes = log.toHex();
        const engineName = decodeOtherEngineName(otherData);

        addEngineToGroup(
          digestGroups.other,
          engineName,
          otherData.toHex(),
          digestBytes
        );
      }
    } catch (error) {
      logWarning("failed_process_digest_log", error, t);
    }
  }

  return {
    blockHash,
    author,
    seal,
    consensusEngine: [
      ...digestGroups.preruntime.map((e) => e.name),
      ...digestGroups.seal.map((e) => e.name),
      ...digestGroups.consensus.map((e) => e.name),
      ...digestGroups.other.map((e) => e.name),
    ].join(", "),
    digestGroups,
  };
};

// Helper function to extract author reward from events
const extractAuthorReward = (events: EventRecord[]): string => {
  for (const event of events) {
    if (
      event.event.section === "balances" &&
      event.event.method === "Deposit"
    ) {
      const eventData = event.event.data;
      if (eventData && eventData.length > 1) {
        const amountData = eventData[1];
        const authorRewardPlanck = amountData.toString();
        const authorRewardP3D =
          Number.parseFloat(authorRewardPlanck) / P3D_DECIMALS_FACTOR;
        if (!Number.isNaN(authorRewardP3D)) {
          return authorRewardP3D.toFixed(4);
        }
      }
      break;
    }
  }
  return "";
};

// Helper function to calculate total block reward
const calculateTotalBlockReward = (
  authorReward: string,
  minerShareValue: string | number
): string => {
  if (!authorReward || !minerShareValue) return "";

  try {
    const authorRewardP3D = Number.parseFloat(authorReward);
    const minerShareNum = Number.parseFloat(minerShareValue.toString());
    if (minerShareNum > 0 && !Number.isNaN(minerShareNum)) {
      const totalReward = authorRewardP3D / (minerShareNum / 100);
      if (!Number.isNaN(totalReward) && Number.isFinite(totalReward)) {
        return totalReward.toFixed(4);
      }
    }
  } catch (error) {
    logWarning("failed_calculate_total_reward", error);
  }
  return "";
};

// Helper function to extract object hashes from digest logs
const extractObjectHashes = (
  logs: SignedBlock["block"]["header"]["digest"]["logs"],
  t?: (key: string) => string
): {
  objectHashAlgo: string;
  objectHashes: string[];
} => {
  let objectHashAlgo = "";
  const objectHashes: string[] = [];

  for (const log of logs) {
    try {
      if (log.isOther && log.asOther) {
        const logString = log.asOther.toString().substring(2);
        if (logString.length >= ALGO_NAME_LENGTH) {
          objectHashAlgo = logString.substring(0, ALGO_NAME_LENGTH);

          let offset = ALGO_NAME_LENGTH;
          while (offset < logString.length) {
            objectHashes.push(
              logString.substring(offset, offset + OBJECT_HASH_LENGTH)
            );
            offset += OBJECT_HASH_LENGTH;
          }
          break;
        }
      }
    } catch (error) {
      logWarning("failed_process_digest_log", error, t);
    }
  }

  return { objectHashAlgo, objectHashes };
};

// Helper function to load 3D object
const load3DObject = async (
  api: ApiPromise,
  blockHash: string,
  t?: (key: string) => string
): Promise<{
  objectObj: string;
  object3d: Mesh;
}> => {
  let objectObj = "";
  let object3d: Mesh;

  try {
    // @ts-expect-error - no definition for poscan in rpc
    const objectObjRaw: Text = await api.rpc.poscan.getMiningObject(blockHash);
    objectObj = objectObjRaw.toString();

    if (objectObj) {
      const loader = new OBJLoader();
      const parsed = loader.parse(objectObj);
      object3d = parsed.children[0] as Mesh;
    } else {
      object3d = createFallbackMesh();
    }
  } catch (error) {
    logWarning("failed_load_mining_object", error, t);
    object3d = createFallbackMesh();
  }

  return { objectObj, object3d };
};

export const loadBlock = async (
  api: ApiPromise,
  hash?: string,
  t?: (key: string) => string
): Promise<IBlock> => {
  const signedBlock =
    hash === undefined
      ? await api.rpc.chain.getBlock()
      : await api.rpc.chain.getBlock(hash);

  const block = signedBlock.block;
  const blockHash = block.header.hash.toHex();

  // Extract additional block metadata
  const metadata = extractBlockMetadata(block, api, t);

  // Query timestamp from runtime state at this block
  let timestamp = "";
  try {
    const timestampValue = await api.query.timestamp.now.at(blockHash);
    if (timestampValue) {
      const timestampMs = timestampValue.toPrimitive() as number;
      timestamp = new Date(timestampMs)
        .toISOString()
        .replace("T", " ")
        .replace("Z", " UTC");
    }
  } catch (error) {
    logWarning("failed_get_timestamp", error, t);
  }

  // Query author's reward and calculate total block reward
  let totalBlockReward = "";

  try {
    const events = await api.query.system.events.at(blockHash);
    const eventsArray = events as unknown as EventRecord[];
    const authorReward = extractAuthorReward(eventsArray);

    if (authorReward) {
      const minerShareOption = await api.query.rewards.minerShare.at(blockHash);
      if (
        minerShareOption &&
        typeof minerShareOption === "object" &&
        "isSome" in minerShareOption &&
        minerShareOption.isSome
      ) {
        const shareValue = (
          minerShareOption as unknown as { unwrap(): string | number }
        ).unwrap();
        totalBlockReward = calculateTotalBlockReward(authorReward, shareValue);
      }
    }
  } catch (error) {
    logWarning("failed_get_reward_info", error, t);
  }

  // Extract object hashes from digest logs
  const { objectHashAlgo, objectHashes } = extractObjectHashes(
    block.header.digest.logs,
    t
  );

  // Load the 3D object data
  const { objectObj, object3d } = await load3DObject(api, blockHash, t);

  return {
    block: signedBlock.block,
    blockHash,
    objectHashAlgo,
    objectHashes,
    objectObj,
    object3d,
    author: metadata.author,
    seal: metadata.seal,
    timestamp,
    consensusEngine: metadata.consensusEngine,
    digestGroups: metadata.digestGroups,
    totalBlockReward,
  };
};
