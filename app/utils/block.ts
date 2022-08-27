import { OBJLoader } from "three-stdlib";
import type { ApiPromise } from "@polkadot/api";
import type { IBlock } from "../components/types";
import type { Mesh } from "three";
import type { Text } from "@polkadot/types";

export const loadBlock = async (api: ApiPromise, hash?: string): Promise<IBlock> => {
  let signedBlock;

  if (hash === undefined) {
    signedBlock = await api.rpc.chain.getBlock();
  } else {
    signedBlock = await api.rpc.chain.getBlock(hash);
  }
  const block = signedBlock.block;
  const blockHash = block.header.hash.toHex();
  const objectHashesString = block.header.digest.logs[2].asOther.toString().substring(2);
  const objectHashes = [];
  for (let i = 0; i < 10; i++) {
    objectHashes.push(objectHashesString.substring(i * 64, (i + 1) * 64));
  }
  // @ts-ignore
  const objectObjRaw: Text = await api.rpc.poscan.getMiningObject(blockHash);
  const objectObj: string = objectObjRaw.toString();

  const loader = new OBJLoader();
  // @ts-ignore
  const object3d: Mesh = loader.parse(objectObj).children[0]; // typed as `Object3D` but really returns the `Mesh` objectẞ

  return {
    block,
    blockHash,
    objectHashes,
    objectObj,
    object3d,
  };
};
