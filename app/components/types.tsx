import type { Block } from "@polkadot/types/interfaces";
import type { Mesh } from "three";

export interface IBlock {
  block: Block;
  blockHash: string;
  objectHashAlgo: string;
  objectHashes: string[];
  objectObj: string;
  object3d: Mesh;
}
