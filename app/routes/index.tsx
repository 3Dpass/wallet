import { Alignment, Card, Classes, Navbar, NavbarDivider, NavbarGroup, NavbarHeading, ProgressBar } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { OBJLoader } from "three-stdlib/loaders/OBJLoader.cjs";
import { rpc, types } from "../api.config";
import { polkadotApiAtom } from "../state";
import { useAtom } from "jotai";

import NetworkState from "../components/NetworkState";
import Wallet from "../components/Wallet";
import Block from "../components/Block";

const DEFAULT_API_ENDPOINT = "wss://rpc2.3dpass.org";
const USE_LOCAL_API = false;
const BLOCK_TO_LOAD = 6;

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

export default function Index() {
  const [blocks, setBlocks] = useState([]);
  const [progress, setProgress] = useState(1 / (BLOCK_TO_LOAD + 1));
  const [apiEndpoint, setApiEndpoint] = useState(USE_LOCAL_API ? "ws://127.0.0.1:9944" : DEFAULT_API_ENDPOINT);
  const [, setApi] = useAtom(polkadotApiAtom);

  useEffect(() => {
    setBlocks([]);
    const provider = new WsProvider(apiEndpoint);
    ApiPromise.create({ provider, rpc, types }).then(async (api) => {
      setApi(api);
      const block = await loadBlock(api);
      let last_block = block;
      setBlocks((prevBlocks) => [...prevBlocks, block]);
      for (let i = 1; i < BLOCK_TO_LOAD; i++) {
        setProgress((i + 1) / (BLOCK_TO_LOAD + 1));
        let parent_hash = last_block.block.header.parentHash.toHex();
        const block = await loadBlock(api, parent_hash);
        last_block = block;
        setBlocks((prevBlocks) => [...prevBlocks, block]);
      }
      setProgress(1.0);
    });
  }, [setApi, apiEndpoint]);

  return (
    <>
      <Navbar>
        <NavbarGroup align={Alignment.LEFT}>
          <NavbarHeading className="whitespace-nowrap">3DP Wallet</NavbarHeading>
          <NavbarDivider />
          <NavbarGroup>
            <input type="text" className={Classes.INPUT} value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} />
          </NavbarGroup>
        </NavbarGroup>
        <div className="hidden lg:block">
          <NavbarGroup align={Alignment.RIGHT}>
            <Wallet />
          </NavbarGroup>
        </div>
      </Navbar>
      {progress < 1.0 && <ProgressBar className="absolute" value={progress} />}
      <Card>
        <NetworkState />
      </Card>
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
