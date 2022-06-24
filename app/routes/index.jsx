import { Alignment, Button, Classes, Navbar, NavbarDivider, NavbarGroup, NavbarHeading, Spinner } from "@blueprintjs/core";
import stylesBlueprint from "@blueprintjs/core/lib/css/blueprint.css";
import { useEffect, useState } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { OBJLoader } from "three-stdlib/loaders/OBJLoader.cjs";
import Block from "../components/Block";
import { rpc, types } from "../api.config";

const LOCAL_NODE = false;
const BLOCK_TO_LOAD = 6;

export function links() {
  return [{ rel: "stylesheet", href: stylesBlueprint }];
}

const loadBlock = async (provider, hash) => {
  const api = await ApiPromise.create({ provider: provider, rpc, types });
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
  return {
    block: block,
    blockHash: blockHash,
    objectHashes: objectHashes,
    data: data,
  };
};

const loadBlocks = async (provider) => {
  const blocks = [];
  const block = await loadBlock(provider);
  blocks.push(block);
  for (let i = 0; i < BLOCK_TO_LOAD - 1; i++) {
    let parent_hash = blocks[blocks.length - 1].block.header.parentHash.toHex();
    let next_block = await loadBlock(provider, parent_hash);
    blocks.push(next_block);
  }
  return blocks;
};

export default function Index() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wsProvider = new WsProvider(LOCAL_NODE ? "ws://127.0.0.1:9944" : "wss://rpc.3dpass.org");
    loadBlocks(wsProvider).then((loaded_blocks) => {
      loaded_blocks = loaded_blocks.map((block) => {
        const loader = new OBJLoader();
        block.object = loader.parse(block.data).children[0];
        return block;
      });
      setBlocks(loaded_blocks);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <Navbar>
        <NavbarGroup align={Alignment.LEFT}>
          <NavbarHeading>3DP Explorer</NavbarHeading>
          <NavbarDivider />
          <NavbarGroup>
            <Button className={Classes.MINIMAL} icon="code-block" text="Blocks" />
          </NavbarGroup>
        </NavbarGroup>
      </Navbar>
      {loading && <Spinner className="p-20" />}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 p-4">
        {!loading &&
          blocks.map((block) => (
            <div key={block.blockHash}>
              <Block block={block} />
            </div>
          ))}
      </div>
    </div>
  );
}
