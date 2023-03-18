import { useAtom } from "jotai";
import { blocksAtom } from "../atoms";
import { lazy, useEffect, useState } from "react";
import { Card, Elevation } from "@blueprintjs/core";
import { formatDuration } from "../utils/time";
import { loadBlock } from "../utils/block";
import { MAX_BLOCKS } from "../api.config";
import TitledValue from "./common/TitledValue";
import type { ApiPromise } from "@polkadot/api";
import { FormattedAmount } from "./common/FormattedAmount";

const TimeAgo = lazy(() => import("react-timeago"));

type INetworkState = {
  totalIssuance: bigint;
  bestNumber: string;
  bestNumberFinalized: string;
  timestamp: number;
  targetBlockTime: number;
};


type IProps = {
  api: false | ApiPromise;
};

export default function NetworkState({ api }: IProps) {
  const [blocks, setBlocks] = useAtom(blocksAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [networkState, setNetworkState] = useState<INetworkState>();
 

  async function loadNetworkState(timestamp) {
    if (!api) {
      return;
    }
    
    setIsLoading(true);
    // @ts-ignore
    const [totalIssuance, bestNumber, bestNumberFinalized, targetBlockTime] = await Promise.all([
      api.query.balances.totalIssuance(),
      api.derive.chain.bestNumber(),
      api.derive.chain.bestNumberFinalized(),
      api.consts.difficulty.targetBlockTime,
    ]);
    setNetworkState({
      totalIssuance: totalIssuance.toString(),
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
      [timestampUnsubscribe, newHeadsUnsubscribe] = await Promise.all([
        api.query.timestamp.now(loadNetworkState),
        api.rpc.chain.subscribeNewHeads((head) => {
          const hash = head.hash.toHex();
          if (isBlockAlreadyLoaded(hash)) {
            return;
          }
          loadBlock(api, hash).then((block) => {
            setBlocks((prevBlocks) => {
              const newBlocks = [block, ...prevBlocks];
              return newBlocks.slice(0, MAX_BLOCKS);
            });
          });
        }),
      ]);
    }

    function unsubscribe() {
      timestampUnsubscribe && timestampUnsubscribe();
      newHeadsUnsubscribe && newHeadsUnsubscribe();
    }

    subscribe(api).then(() => {});
    return unsubscribe;
  }, [api]);

  if (isLoading && !networkState) {
    return <div className="mb-4 w-100 h-[100px] border border-gray-500 border-dashed"></div>;
  }

  let cardClassName = "grid gap-y-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-6";
  if (isLoading) {
    cardClassName += " opacity-50";
  }

  return (
    <Card className="mb-4" elevation={Elevation.ZERO}>
      <div className={cardClassName}>
        <TitledValue title="Best block" value={networkState.bestNumber} />
        <TitledValue title="Finalized" value={networkState.bestNumberFinalized} />
        <TitledValue title="Latest block" value={<TimeAgo date={networkState.timestamp} live={true} />} />
        <TitledValue title="Target" value={formatDuration(networkState.targetBlockTime)} />
        <TitledValue title="Total issuance" value={<FormattedAmount value={networkState.totalIssuance} />} />
      </div>
    </Card>
  );
}
