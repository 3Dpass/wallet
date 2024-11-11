import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Elevation, Spinner } from '@blueprintjs/core';
import { useApi } from 'app/components/Api';
import { DeriveCollectiveProposal } from '@polkadot/api-derive/types';
import { AccountName } from 'app/components/common/AccountName';

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

    void fetchMotions();
  }, [api]);

  if (loading) {
    return <Spinner />;
  }

  return (
    <Card elevation={Elevation.ONE}>
      <h2 className="text-xl mb-4">{t("governance.motions")}</h2>
      <div className="grid gap-4">
        {motions.map((motion) => (
          <Card key={motion.hash.toString()} elevation={Elevation.TWO}>
            <div className="p-4">
              {motion.proposal && motion.votes && (
                <>
                  <div className="flex justify-between mb-3">
                    <div className="text-lg font-medium">
                      {motion.proposal.section}.{motion.proposal.method}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t("governance.votes_threshold", {
                        ayes: motion.votes.ayes?.length || 0,
                        threshold: motion.votes.threshold?.toNumber() || 0
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="font-medium mb-2">{t("governance.ayes")}</div>
                      {motion.votes.ayes?.map(address => (
                        <div key={address.toString()} className="mb-1">
                          <AccountName address={address.toString()} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="font-medium mb-2">{t("governance.nays")}</div>
                      {motion.votes.nays?.map(address => (
                        <div key={address.toString()} className="mb-1">
                          <AccountName address={address.toString()} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
} 