import { Card, Spinner, H4, Tag, Intent, HTMLTable } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";
import { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import { AccountName } from "app/components/common/AccountName";
import { FormattedAmount } from "app/components/common/FormattedAmount";
import type { Option } from "@polkadot/types";
import { useApi } from "app/components/Api";
import { useEffect, useState } from "react";
import { hexToString } from "@polkadot/util";

interface BountyCuratorProposalProps {
  bountyId: string;
  curator: string;
  fee: bigint;
  motion: DeriveCollectiveProposal;
}

export function BountyCuratorProposal({ bountyId, curator, fee, motion }: BountyCuratorProposalProps) {
  const { t } = useTranslation();
  const api = useApi();
  const [bountyData, setBountyData] = useState<any | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) return;

    const loadBounty = async () => {
      try {
        const bountyInfo = (await api.query.bounties.bounties(bountyId)) as Option<any>;
        const unwrapped = bountyInfo.unwrapOr(null);

        // Fetch description from bounty description storage
        const descriptionHash = (await api.query.bounties.bountyDescriptions(bountyId)) as Option<any>;
        if (descriptionHash.isSome) {
          const rawDescription = descriptionHash.unwrap();
          try {
            const decodedDescription = hexToString(rawDescription.toHex());
            setDescription(decodedDescription);
          } catch (error) {
            console.error("Failed to decode description:", error);
            setDescription(rawDescription.toString());
          }
        }

        setBountyData(unwrapped);
      } catch (error) {
        console.error("Failed to load bounty:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBounty();
  }, [api, bountyId]);

  if (loading) {
    return (
      <Card>
        <H4>Propose Curator for Bounty #{bountyId}</H4>
        <div className="flex items-center gap-2 mt-2">
          <Spinner size={16} /> {t("common.loading")}
        </div>
      </Card>
    );
  }

  if (!bountyData) {
    return (
      <Card>
        <H4>Propose Curator for Bounty #{bountyId}</H4>
        <Tag intent={Intent.DANGER} className="mt-2">
          {t("governance.bounty_not_found")}
        </Tag>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl w-full">
      <div className="mb-3">
        <H4>Propose Curator for Bounty #{bountyId}</H4>
      </div>
      <div className="space-y-2">
        {description && (
          <div className="flex">
            <div className="w-1/4 text-gray-500">{t("governance.description")}</div>
            <div className="w-3/4">{description}</div>
          </div>
        )}
        <div className="flex">
          <div className="w-1/4 text-gray-500">{t("governance.curator")}</div>
          <div className="w-3/4">
            <AccountName address={curator} />
          </div>
        </div>
        <div className="flex">
          <div className="w-1/4 text-gray-500">{t("governance.curator_fee")}</div>
          <div className="w-3/4">
            <FormattedAmount value={fee} />
          </div>
        </div>
        <div className="flex">
          <div className="w-1/4 text-gray-500">{t("governance.bounty_value")}</div>
          <div className="w-3/4">
            <FormattedAmount value={bountyData.value.toBigInt()} />
          </div>
        </div>
        {bountyData.proposer && (
          <div className="flex">
            <div className="w-1/4 text-gray-500">{t("governance.proposer")}</div>
            <div className="w-3/4">
              <AccountName address={bountyData.proposer.toString()} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
