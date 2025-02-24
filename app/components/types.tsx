import type { SignedBlock } from "@polkadot/types/interfaces";
import type { Mesh } from "three";

export interface IBlock {
  block: SignedBlock;
  blockHash: string;
  objectHashAlgo: string;
  objectHashes: string[];
  objectObj: string;
  object3d: Mesh;
}
