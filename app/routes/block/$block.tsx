import { Link, useParams } from "@remix-run/react";
import { Card, Spinner } from "@blueprintjs/core";
import TitledValue from "../../components/common/TitledValue";
import type { BlockData, BlockVars, LogsData, LogsVars } from "../../queries";
import { GET_BLOCK, GET_LOGS } from "../../queries";
import Moment from "react-moment";
import { useQuery } from "@apollo/client";
import Error from "../../components/common/Error";
import { ExplorerUrl } from "../../components/common/ExplorerForward";

export default function Block() {
  const { block } = useParams();
  const blockNumber = parseInt(block, 10);

  const queryBlock = useQuery<BlockData, BlockVars>(GET_BLOCK, {
    variables: { blockId: blockNumber },
  });
  const queryLogs = useQuery<LogsData, LogsVars>(GET_LOGS, {
    variables: { blockId: blockNumber },
  });

  if (queryBlock.loading || queryLogs.loading) return <Spinner />;
  if (queryBlock.error || queryLogs.error) return <Error>Error loading block data, try to reload.</Error>;

  return (
    <Card>
      <div className="flex gap-4 mb-6">
        <TitledValue title="Block" value={<Link to={ExplorerUrl.block({block})}>{block}</Link>} fontMono={true} className="mr-4" />
        <TitledValue title="Date" value={<Moment date={queryBlock.data.getBlock.datetime} format="lll Z" interval={0} />} />
      </div>
      <div className="flex gap-4 mb-3">
        <TitledValue title="Hash" value={queryBlock.data.getBlock.hash} fontMono={true} />
      </div>
      <div className="flex gap-4 mb-3">
        <TitledValue title="Spec Name" value={queryBlock.data.getBlock.specName} fontMono={true} />
        <TitledValue title="Spec Version" value={queryBlock.data.getBlock.specVersion} fontMono={true} />
      </div>
      <div className="flex gap-4 mb-3">
        <TitledValue title="Extrinsics" value={queryBlock.data.getBlock.countExtrinsics} fontMono={true} />
        <TitledValue title="Events" value={queryBlock.data.getBlock.countEvents} fontMono={true} />
        <TitledValue title="Logs" value={queryBlock.data.getBlock.countLogs} fontMono={true} />
      </div>
      <div className="flex flex-col gap-4 mt-6">
        {queryLogs.data.getLogs.objects.map((log) => (
          <div key={log.logIdx} className="flex flex-col gap-2">
            <div className="flex gap-4">
              <TitledValue title="Log Idx" value={log.logIdx} fontMono={true} fontSmall={true} />
              <TitledValue title="Type" value={log.typeName} fontMono={true} fontSmall={true} />
            </div>
            <TitledValue title="Data" value={log.data} fontMono={true} fontSmall={true} />
          </div>
        ))}
      </div>
    </Card>
  );
}
