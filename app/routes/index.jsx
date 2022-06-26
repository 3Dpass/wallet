import { Alignment, Classes, Navbar, NavbarDivider, NavbarGroup, NavbarHeading, ProgressBar, Switch } from "@blueprintjs/core";
import stylesBlueprint from "@blueprintjs/core/lib/css/blueprint.css";
import { useEffect, useState } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { OBJLoader } from "three-stdlib/loaders/OBJLoader.cjs";
import Block from "../components/Block";
import { rpc, types } from "../api.config";

const DEFAULT_API_ENDPOINT = "wss://rpc2.3dpass.org";
const BLOCK_TO_LOAD = 6;

export function links() {
  return [{ rel: "stylesheet", href: stylesBlueprint }];
}

const loadBlock = async (api, hash) => {
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

export default function Index() {
  const [blocks, setBlocks] = useState([]);
  const [progress, setProgress] = useState(1 / (BLOCK_TO_LOAD + 1));
  const [apiEndpoint, setApiEndpoint] = useState(DEFAULT_API_ENDPOINT);
  const [useLocalApiEndpoint, setUseLocalApiEndpoint] = useState(false);

  useEffect(() => {
    setBlocks([]);
    const provider = new WsProvider(useLocalApiEndpoint ? "ws://127.0.0.1:9944" : apiEndpoint);
    ApiPromise.create({ provider, rpc, types }).then(async (api) => {
      let block = await loadBlock(api);
      setBlocks((prevBlocks) => [...prevBlocks, block]);
      for (let i = 1; i < BLOCK_TO_LOAD; i++) {
        setProgress((i + 1) / (BLOCK_TO_LOAD + 1));
        let parent_hash = block.block.header.parentHash.toHex();
        block = await loadBlock(api, parent_hash);
        setBlocks((prevBlocks) => [...prevBlocks, block]);
      }
      setProgress(1.0);
    });
  }, [apiEndpoint, useLocalApiEndpoint]);

  return (
    <div>
      <Navbar>
        <NavbarGroup align={Alignment.LEFT}>
          <NavbarHeading className="whitespace-nowrap">3DP Explorer</NavbarHeading>
          <NavbarDivider />
          <NavbarGroup>
            <input type="text" className={Classes.INPUT} value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} />
            <div className="ml-4 hidden sm:block">
              <Switch style={{ marginBottom: 0 }} checked={useLocalApiEndpoint} label="Use local node" onChange={(e) => setUseLocalApiEndpoint(e.target.checked)} />
            </div>
          </NavbarGroup>
        </NavbarGroup>
      </Navbar>
      {progress < 1.0 && <ProgressBar value={progress} />}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 p-4">
        {blocks.map((block) => (
          <div key={block.blockHash}>
            <Block block={block} />
          </div>
        ))}
      </div>
    </div>
  );
}
