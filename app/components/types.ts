import type { Block } from "@polkadot/types/interfaces";
import type { Mesh } from "three";

export interface IBlock {
  block: Block;
  blockHash: string;
  objectHashAlgo: string;
  objectHashes: string[];
  objectObj: string;
  object3d: Mesh;
  author: string;
  seal: string;
  timestamp: string;
  consensusEngine: string;
  digestGroups: {
    preruntime: Array<{ name: string; bytes: string; digestBytes: string }>;
    seal: Array<{ name: string; bytes: string; digestBytes: string }>;
    consensus: Array<{ name: string; bytes: string; digestBytes: string }>;
    other: Array<{ name: string; bytes: string; digestBytes: string }>;
  };
  totalBlockReward: string;
}
