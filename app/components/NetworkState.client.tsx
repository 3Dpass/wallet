import { useAtom, useAtomValue } from "jotai";
import { blocksAtom, polkadotApiAtom } from "../atoms";
import { lazy, useEffect, useState } from "react";
import { Card, Spinner } from "@blueprintjs/core";
import { formatDuration } from "../utils/time";
import type { AnyJson } from "@polkadot/types-codec/types/helpers";
import { loadBlock } from "../utils/block";

const TimeAgo = lazy(() => import("react-timeago"));

type INetworkState = {
  totalIssuance: string;
  bestNumber: string;
  bestNumberFinalized: string;
  timestamp: AnyJson;
  targetBlockTime: number;
};

export default function NetworkState() {
  const api = useAtomValue(polkadotApiAtom);
  const [blocks, setBlocks] = useAtom(blocksAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [networkState, setNetworkState] = useState<INetworkState>();

  async function loadNetworkState() {
    if (!api) {
      return;
    }
    setIsLoading(true);
    const totalIssuance = await api.query.balances.totalIssuance();
    const bestNumber = await api.derive.chain.bestNumber();
    const bestNumberFinalized = await api.derive.chain.bestNumberFinalized();
    const timestamp = await api.query.timestamp.now();
    const targetBlockTime = await api.consts.difficulty.targetBlockTime;
    setNetworkState({
      totalIssuance: totalIssuance.toHuman().toString(),
      bestNumber: bestNumber.toHuman().toString(),
      bestNumberFinalized: bestNumberFinalized.toHuman().toString(),
      timestamp: timestamp.toJSON(),
      targetBlockTime: parseInt(targetBlockTime.toString()) / 1000,
    });
    setIsLoading(false);
  }

  function isBlockAlreadyLoaded(hash) {
    return blocks.some((block) => block.blockHash === hash);
  }

  useEffect(() => {
    if (!api) {
      return;
    }

    let timestampUnsubscribe, newHeadsUnsubscribe;

    async function subscribe(api) {
      timestampUnsubscribe = await api.query.timestamp.now(loadNetworkState);
      newHeadsUnsubscribe = await api.rpc.chain.subscribeNewHeads((head) => {
        const hash = head.hash.toHex();
        if (isBlockAlreadyLoaded(hash)) {
          return;
        }
        loadBlock(api, hash).then((block) => {
          setBlocks((prevBlocks) => [block, ...prevBlocks]);
        });
      });
    }

    subscribe(api);

    return () => {
      timestampUnsubscribe();
      newHeadsUnsubscribe();
    };
  }, [api]);

  if (isLoading && !networkState) {
    return <Spinner />;
  }

  let cardClassName = "grid gap-y-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-6";
  if (isLoading) {
    cardClassName += " opacity-50";
  }

  return (
    <Card className="mb-4">
      <div className={cardClassName}>
        <div>
          <div className="text-sm text-gray-500">Best Block</div>
          <div className="text-xl">{networkState.bestNumber}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Finalized</div>
          <div className="text-xl">{networkState.bestNumberFinalized}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Last Block</div>
          <div className="text-xl">
            <TimeAgo date={networkState.timestamp} live={true} />
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Target</div>
          <div className="text-xl">{formatDuration(networkState.targetBlockTime)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Total Issuance</div>
          <div className="text-xl">{networkState.totalIssuance}</div>
        </div>
      </div>
    </Card>
  );
}
