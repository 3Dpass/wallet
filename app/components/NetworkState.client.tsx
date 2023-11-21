import { useAtom, useSetAtom } from "jotai";
import { bestNumberFinalizedAtom, blocksAtom } from "../atoms";
import { useEffect, useState } from "react";
import { Card, Elevation } from "@blueprintjs/core";
import { formatDuration } from "../utils/time";
import { loadBlock } from "../utils/block";
import { MAX_BLOCKS } from "../api.config";
import TitledValue from "./common/TitledValue";
import type { ApiPromise } from "@polkadot/api";
import { FormattedAmount } from "./common/FormattedAmount";
import TimeAgo from "react-timeago";
import { useApi } from "./Api";
import { useTranslation } from "react-i18next";

type INetworkState = {
  totalIssuance: bigint;
  bestNumber: bigint;
  bestNumberFinalized: bigint;
  timestamp: number;
  targetBlockTime: number;
};

export default function NetworkState() {
  const { t } = useTranslation();
  const api = useApi();
  const [blocks, setBlocks] = useAtom(blocksAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [networkState, setNetworkState] = useState<INetworkState>();
  const setBestNumberFinalized = useSetAtom(bestNumberFinalizedAtom);

  async function loadNetworkState(api: ApiPromise) {
    setIsLoading(true);
    const [totalIssuance, timestamp, bestNumber, bestNumberFinalized, targetBlockTime] = await Promise.all([
      api.query.balances.totalIssuance(),
      api.query.timestamp.now(),
      api.derive.chain.bestNumber(),
      api.derive.chain.bestNumberFinalized(),
      api.consts.difficulty.targetBlockTime,
    ]);
    setNetworkState({
      totalIssuance: BigInt(totalIssuance.toString()),
      bestNumber: bestNumber.toBigInt(),
      bestNumberFinalized: bestNumberFinalized.toBigInt(),
      timestamp: timestamp.toPrimitive() as number,
      targetBlockTime: parseInt(targetBlockTime.toString()) / 1000,
    });

    setBestNumberFinalized(bestNumberFinalized.toBigInt());

    setIsLoading(false);
  }

  function isBlockAlreadyLoaded(hash: string) {
    return blocks.some((block) => block.blockHash === hash);
  }

  useEffect(() => {
    if (!api) {
      return;
    }

    let newHeadsUnsubscribe: () => void;

    async function subscribe(api: ApiPromise) {
      [newHeadsUnsubscribe] = await Promise.all([
        api.rpc.chain.subscribeNewHeads((head) => {
          const hash = head.hash.toHex();
          loadNetworkState(api);
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

    void subscribe(api);

    return () => {
      newHeadsUnsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  if (!networkState) {
    return <div className="mb-4 w-100 h-[100px] border border-gray-500 border-dashed" />;
  }

  let cardClassName = "grid gap-y-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-6";
  if (isLoading) {
    cardClassName += " opacity-50";
  }

  return (
    <Card className="mb-4" elevation={Elevation.ZERO}>
      <div className={cardClassName}>
        <TitledValue title={t("root.lbl_best_block")} value={networkState.bestNumber.toLocaleString()} />
        <TitledValue title={t("root.lbl_finalized")} value={networkState.bestNumberFinalized.toLocaleString()} />
        <TitledValue title={t("root.lbl_latest_block")} value={<TimeAgo date={networkState.timestamp} live />} />
        <TitledValue title={t("root.lbl_target")} value={formatDuration(networkState.targetBlockTime)} />
        <TitledValue title={t("root.lbl_total_issuance")} value={<FormattedAmount value={networkState.totalIssuance} />} />
      </div>
    </Card>
  );
}
