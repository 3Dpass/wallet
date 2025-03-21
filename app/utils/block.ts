import type { ApiPromise } from "@polkadot/api";
import type { Text } from "@polkadot/types";
import type { SignedBlock } from "@polkadot/types/interfaces";
import type { Mesh } from "three";
import { OBJLoader } from "three-stdlib";
import type { IBlock } from "../components/types";

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

  const objectHashesString = block.header.digest.logs[2].asOther
    .toString()
    .substring(2);
  const objectHashAlgo = objectHashesString.substring(0, algoNameLength);

  const objectHashes = [];
  let offset = algoNameLength;
  while (offset < objectHashesString.length) {
    objectHashes.push(
      objectHashesString.substring(offset, offset + objectHashLength)
    );
    offset += objectHashLength;
  }

  // @ts-expect-error - no definition for poscan in rpc
  const objectObjRaw: Text = await api.rpc.poscan.getMiningObject(blockHash);
  const objectObj: string = objectObjRaw.toString();

  const loader = new OBJLoader();
  // @ts-expect-error - typed as `Object3D` but really returns the `Mesh` object
  const object3d: Mesh = loader.parse(objectObj).children[0];

  return {
    block: signedBlock.block,
    blockHash,
    objectHashAlgo,
    objectHashes,
    objectObj,
    object3d,
  };
};
