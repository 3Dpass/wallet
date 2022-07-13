import { useAtomValue } from "jotai";
import { polkadotApiAtom } from "../atoms";
import { lazy, useEffect, useState } from "react";
import { Spinner } from "@blueprintjs/core";
import { formatDuration } from "../utils/time";
import type { AnyJson } from "@polkadot/types-codec/types/helpers";

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
  const [isLoading, setIsLoading] = useState(true);
  const [networkState, setNetworkState] = useState<INetworkState>();

  useEffect(() => {
    async function loadData() {
      if (!api) {
        return false;
      }
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

    loadData().then(() => {});
  }, [api]);

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div>
      <div className="grid gap-y-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <div>
          <div className="text-sm">Best Block</div>
          <div className="text-2xl">{networkState.bestNumber}</div>
        </div>
        <div>
          <div className="text-sm">Finalized</div>
          <div className="text-2xl">{networkState.bestNumberFinalized}</div>
        </div>
        <div>
          <div className="text-sm">Last Block</div>
          <div className="text-2xl">
            <TimeAgo date={networkState.timestamp} live={true} />
          </div>
        </div>
        <div>
          <div className="text-sm">Target</div>
          <div className="text-2xl">{formatDuration(networkState.targetBlockTime)}</div>
        </div>
        <div>
          <div className="text-sm">Total Issuance</div>
          <div className="text-2xl">{networkState.totalIssuance}</div>
        </div>
      </div>
    </div>
  );
}
