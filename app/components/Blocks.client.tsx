import Block from "./Block.client";
import { OBJLoader } from "three-stdlib";
import { lazy, useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { polkadotApiAtom } from "../atoms";

const ProgressBar = lazy(() => import("@blueprintjs/core").then((module) => ({ default: module.ProgressBar })));

export default function Blocks({ count }) {
  const api = useAtomValue(polkadotApiAtom);
  const [blocks, setBlocks] = useState([]);
  const [progress, setProgress] = useState(1 / (count + 1));

  useEffect(() => {
    if (!api) {
      return;
    }

    async function loadBlocks() {
      setBlocks([]);
      const block = await loadBlock(api);
      let last_block = block;
      setBlocks((prevBlocks) => [...prevBlocks, block]);
      for (let i = 1; i < count; i++) {
        setProgress((i + 1) / (count + 1));
        let parent_hash = last_block.block.header.parentHash.toHex();
        const block = await loadBlock(api, parent_hash);
        last_block = block;
        setBlocks((prevBlocks) => [...prevBlocks, block]);
      }
      setProgress(1.0);
    }

    loadBlocks().then(() => {});
  }, [api]);

  return (
    <>
      {progress < 1.0 && <ProgressBar className="absolute" value={progress} />}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 p-4">
        {blocks.map((block) => (
          <div key={block.blockHash}>
            <Block block={block} />
          </div>
        ))}
      </div>
    </>
  );
}

const loadBlock = async (api, hash?: string) => {
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
