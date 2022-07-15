import { OBJLoader } from "three-stdlib";
import type { ApiPromise } from "@polkadot/api";

export const loadBlock = async (api: ApiPromise, hash?: string) => {
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
  const data = await api.rpc.poscan.getMiningObject(blockHash);

  const loader = new OBJLoader();
  const object = loader.parse(data).children[0];

  return {
    block: block,
    blockHash: blockHash,
    objectHashes: objectHashes,
    object: object,
  };
};
