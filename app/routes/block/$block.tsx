import { useParams } from "@remix-run/react";
import { Card, Spinner } from "@blueprintjs/core";
import TitledValue from "../../components/common/TitledValue";
import { useEffect, useState } from "react";
import type { IBlockData, ILogData } from "../../queries";
import { getBlock, getLogs } from "../../queries";
import { useAtomValue } from "jotai";
import { apiExplorerAtom } from "../../atoms";
import Moment from "react-moment";

export default function Block() {
  const { block } = useParams();
  const apiExplorer = useAtomValue(apiExplorerAtom);
  const [blockData, setBlockData] = useState<IBlockData | false>(false);
  const [logs, setLogs] = useState<ILogData[] | false>(false);

  useEffect(() => {
    async function loadBlock() {
      if (!apiExplorer) {
        return false;
      }
      const result = await apiExplorer.query({
        query: getBlock(block),
      });
      setBlockData(result.data.getBlock);
    }

    async function loadLogs() {
      if (!apiExplorer) {
        return false;
      }
      const result = await apiExplorer.query({
        query: getLogs(block),
      });
      setLogs(result.data.getLogs.objects);
      console.log(result.data.getLogs.objects);
    }

    loadBlock().then();
    loadLogs().then();
  }, [block, apiExplorer]);

  return (
    <Card>
      {!blockData && <Spinner />}
      {blockData && (
        <>
          <div className="flex gap-4 mb-6">
            <TitledValue title="Block" value={block} fontMono={true} className="mr-4" />
            <TitledValue title="Date" value={<Moment date={blockData.datetime} format="lll Z" interval={0} />} />
          </div>
          <div className="flex gap-4 mb-3">
            <TitledValue title="Hash" value={blockData.hash} fontMono={true} />
          </div>
          <div className="flex gap-4 mb-3">
            <TitledValue title="Spec Name" value={blockData.specName} fontMono={true} />
            <TitledValue title="Spec Version" value={blockData.specVersion} fontMono={true} />
          </div>
          <div className="flex gap-4 mb-3">
            <TitledValue title="Extrinsics" value={blockData.countExtrinsics} fontMono={true} />
            <TitledValue title="Events" value={blockData.countEvents} fontMono={true} />
            <TitledValue title="Logs" value={blockData.countLogs} fontMono={true} />
          </div>
        </>
      )}
      {!logs && <Spinner />}
      {logs && (
        <div className="flex flex-col gap-4 mt-6">
          {logs.map((log) => (
            <div key={log.logIdx} className="flex flex-col gap-2">
              <div className="flex gap-4">
                <TitledValue title="Log Idx" value={log.logIdx} fontMono={true} fontSmall={true} />
                <TitledValue title="Type" value={log.typeName} fontMono={true} fontSmall={true} />
              </div>
              <TitledValue title="Data" value={log.data} fontMono={true} fontSmall={true} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
