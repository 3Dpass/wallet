import type { Mesh } from "three";

export interface IBlock {
  block: any;
  blockHash: string;
  objectHashHeader: string;
  objectHashes: string[];
  objectObj: string;
  object3d: Mesh;
}
