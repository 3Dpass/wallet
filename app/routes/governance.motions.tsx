import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, Elevation, Spinner, Tag, Intent, HTMLTable, Classes } from "@blueprintjs/core";
import { useApi } from "app/components/Api";
import { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import { AccountName } from "app/components/common/AccountName";

export default function GovernanceMotions() {
  const { t } = useTranslation();
  const api = useApi();
  const [motions, setMotions] = useState<DeriveCollectiveProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMotions() {
      if (!api) return;

      try {
        const proposals = await api.derive.council.proposals();
        setMotions(proposals);
      } catch (error) {
        console.error("Error fetching motions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMotions();
  }, [api]);

  if (loading) {
    return <Spinner />;
  }

  return (
    <Card elevation={Elevation.ONE} className="p-4">
      <h2 className={`${Classes.HEADING} mb-4`}>{t("governance.motions")}</h2>
      <HTMLTable className="w-full">
        <thead>
          <tr>
            <th className="w-16">#</th>
            <th>{t("governance.motion")}</th>
            <th>{t("governance.votes")}</th>
            <th className="w-24 text-right">{t("governance.threshold")}</th>
          </tr>
        </thead>
        <tbody>
          {motions.map(
            (motion) =>
              motion.proposal &&
              motion.votes && (
                <tr key={motion.hash.toString()}>
                  <td>
                    <Tag minimal round>
                      {motion.votes.index.toString()}
                    </Tag>
                  </td>
                  <td>
                    <div className={`${Classes.TEXT_LARGE} font-medium`}>
                      {motion.proposal.section}.{motion.proposal.method}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Tag intent={Intent.SUCCESS} minimal>
                          {motion.votes.ayes?.length || 0}
                        </Tag>
                        <div className="flex flex-wrap gap-1">
                          {motion.votes?.ayes?.map((address) => (
                            <Tag key={address.toString()} minimal className={Classes.TEXT_SMALL}>
                              <AccountName address={address.toString()} />
                            </Tag>
                          ))}
                        </div>
                      </div>
                      {motion.votes?.nays?.length ? (
                        <div className="flex items-center gap-2">
                          <Tag intent={Intent.DANGER} minimal>
                            {motion.votes.nays.length}
                          </Tag>
                          <div className="flex flex-wrap gap-1">
                            {motion.votes?.nays?.map((address) => (
                              <Tag key={address.toString()} minimal className={Classes.TEXT_SMALL}>
                                <AccountName address={address.toString()} />
                              </Tag>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="text-right">
                    <Tag intent={Intent.PRIMARY} minimal>
                      {motion.votes.ayes?.length || 0}/{motion.votes.threshold?.toNumber() || 0}
                    </Tag>
                  </td>
                </tr>
              )
          )}
        </tbody>
      </HTMLTable>
    </Card>
  );
}
