import { useAtom } from "jotai";
import { blocksAtom } from "../atoms";
import { lazy, useEffect, useState } from "react";
import { Card, Elevation } from "@blueprintjs/core";
import { formatDuration } from "../utils/time";
import type { u128 } from "@polkadot/types-codec";
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
  api: ApiPromise;
};

export default function NetworkState({ api }: IProps) {
  const [blocks, setBlocks] = useAtom(blocksAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [networkState, setNetworkState] = useState<INetworkState>();

  async function loadNetworkState(timestamp) {
    setIsLoading(true);
    // @ts-ignore
    const totalIssuance: u128 = await api.query.balances.totalIssuance();
    const bestNumber = await api.derive.chain.bestNumber();
    const bestNumberFinalized = await api.derive.chain.bestNumberFinalized();
    const targetBlockTime = await api.consts.difficulty.targetBlockTime;
    setNetworkState({
      totalIssuance: totalIssuance.toBigInt(),
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
          setBlocks((prevBlocks) => {
            const newBlocks = [block, ...prevBlocks];
            return newBlocks.slice(0, MAX_BLOCKS);
          });
        });
      });
    }

    function unsubscribe() {
      timestampUnsubscribe && timestampUnsubscribe();
      newHeadsUnsubscribe && newHeadsUnsubscribe();
    }

    subscribe(api).then(() => {});
    return unsubscribe;
  }, [api]);

  if (isLoading && !networkState) {
    return <div className="mb-4 w-100 h-[100px] animate-pulse bg-gray-600"></div>;
  }

  let cardClassName = "grid gap-y-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-6";
  if (isLoading) {
    cardClassName += " opacity-50";
  }

  return (
    <Card className="mb-4" elevation={Elevation.TWO}>
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
