import type { ApiPromise } from "@polkadot/api";
import type { Text } from "@polkadot/types";
import type { SignedBlock } from "@polkadot/types/interfaces";
import type { Mesh } from "three";
import * as THREE from "three";
import { OBJLoader } from "three-stdlib";
import type { IBlock } from "../components/types";

// Create a fallback mesh when 3D object loading fails
const createFallbackMesh = (): Mesh => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhongMaterial({ color: 0x666666 });
  return new THREE.Mesh(geometry, material);
};

export const loadBlock = async (
  api: ApiPromise,
  hash?: string
): Promise<IBlock> => {
  let signedBlock: SignedBlock;

  const algoNameLength = 32;
  const objectHashLength = 64;

  if (hash === undefined) {
    signedBlock = await api.rpc.chain.getBlock();
  } else {
    signedBlock = await api.rpc.chain.getBlock(hash);
  }
  const block = signedBlock.block;
  const blockHash = block.header.hash.toHex();

  // Find the correct digest log entry that contains mining object data
  let objectHashesString = "";
  let objectHashAlgo = "";
  const objectHashes: string[] = [];

  // Look for a digest log that can be converted via asOther
  for (const log of block.header.digest.logs) {
    try {
      if (log.isOther && log.asOther) {
        const logString = log.asOther.toString().substring(2);
        // Check if this looks like mining object data (has reasonable length)
        if (logString.length >= algoNameLength) {
          objectHashesString = logString;
          objectHashAlgo = objectHashesString.substring(0, algoNameLength);

          let offset = algoNameLength;
          while (offset < objectHashesString.length) {
            objectHashes.push(
              objectHashesString.substring(offset, offset + objectHashLength)
            );
            offset += objectHashLength;
          }
          break;
        }
      }
    } catch (error) {
      // Skip this log entry if it can't be converted
      console.warn("Failed to process digest log:", error);
    }
  }

  // Load the 3D object data with error handling
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
      // Create fallback mesh if no object data
      object3d = createFallbackMesh();
    }
  } catch (error) {
    console.warn("Failed to load mining object for block:", blockHash, error);
    // Create a fallback mesh if object loading fails
    object3d = createFallbackMesh();
  }

  return {
    block: signedBlock.block,
    blockHash,
    objectHashAlgo,
    objectHashes,
    objectObj,
    object3d,
  };
};
