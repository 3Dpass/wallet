import { Link, useParams } from "@remix-run/react";
import { Card, Spinner } from "@blueprintjs/core";
import TitledValue from "../components/common/TitledValue";
import type { BlockData, BlockVars, LogsData, LogsVars } from "../queries";
import { GET_BLOCK, GET_LOGS } from "../queries";
import Moment from "react-moment";
import { useQuery } from "@apollo/client";
import Error from "../components/common/Error";
import { ExplorerUrl } from "../components/common/ExplorerForward";
import { useTranslation } from "react-i18next";

export default function Block() {
  const { t } = useTranslation();
  const { block } = useParams();
  const blockNumber = parseInt(block as string, 10);

  const queryBlock = useQuery<BlockData, BlockVars>(GET_BLOCK, {
    variables: { blockId: blockNumber },
  });
  const queryLogs = useQuery<LogsData, LogsVars>(GET_LOGS, {
    variables: { blockId: blockNumber },
  });

  if (queryBlock.loading || queryLogs.loading) return <Spinner />;
  if (queryBlock.error || queryLogs.error) return <Error>Error loading block data, try to reload.</Error>;

  const blockUrl = ExplorerUrl.block({ block });
  return (
    queryBlock.data && (
      <Card>
        <div className="flex gap-4 mb-6">
          <TitledValue title={t('commons.lbl_block')} value={<Link to={blockUrl}>{block}</Link>} fontMono={true} />
          <TitledValue title={t('commons.lbl_date')} value={<Moment date={queryBlock.data.getBlock.datetime} format="lll Z" interval={0} />} />
        </div>
        <div className="flex gap-4 mb-3">
          <TitledValue title={t('screen_block.lbl_hash')} value={queryBlock.data.getBlock.hash} fontMono={true} />
        </div>
        <div className="flex gap-4 mb-3">
          <TitledValue title={t('screen_block.lbl_spec_name')} value={queryBlock.data.getBlock.specName} fontMono={true} />
          <TitledValue title={t('screen_block.lbl_spec_version')} value={queryBlock.data.getBlock.specVersion} fontMono={true} />
        </div>
        <div className="flex gap-4 mb-3">
          <TitledValue title={t('screen_block.lbl_extrinsics')} value={<Link to={blockUrl}>{queryBlock.data.getBlock.countExtrinsics}</Link>} fontMono={true} />
          <TitledValue title={t('screen_block.lbl_events')} value={<Link to={blockUrl}>{queryBlock.data.getBlock.countEvents}</Link>} fontMono={true} />
          <TitledValue title={t('screen_block.lbl_logs')} value={<Link to={blockUrl}>{queryBlock.data.getBlock.countLogs}</Link>} fontMono={true} />
        </div>
        <div className="flex flex-col gap-4 mt-6">
          {queryLogs.data &&
            queryLogs.data.getLogs.objects.map((log) => (
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
    )
  );
}
