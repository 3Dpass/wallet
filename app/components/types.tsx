import type { Mesh } from "three";

export interface IBlock {
  block: any;
  blockHash: string;
  objectHashes: string[];
  objectObj: string;
  object3d: Mesh;
}
