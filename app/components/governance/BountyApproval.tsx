import { Card, Spinner, H4, Tag, Intent, HTMLTable } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";
import { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import { AccountName } from "app/components/common/AccountName";
import { FormattedAmount } from "app/components/common/FormattedAmount";
import type { Option } from "@polkadot/types";
import { useApi } from "app/components/Api";
import { useEffect, useState } from "react";
import { hexToString } from "@polkadot/util";

interface BountyApprovalProps {
  bountyId: string;
  motion: DeriveCollectiveProposal;
}

export function BountyApproval({ bountyId, motion }: BountyApprovalProps) {
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
          // Convert the hex description to a human-readable string
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
        <H4>Approve Bounty #{bountyId}</H4>
        <div className="flex items-center gap-2 mt-2">
          <Spinner size={16} /> {t("common.loading")}
        </div>
      </Card>
    );
  }

  if (!bountyData) {
    return (
      <Card>
        <H4>Approve Bounty #{bountyId}</H4>
        <Tag intent={Intent.DANGER} className="mt-2">
          {t("governance.bounty_not_found")}
        </Tag>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl w-full">
      <H4>Approve Bounty #{bountyId}</H4>
      <HTMLTable className="w-full mt-4 min-w-[600px]" compact={true} striped={true}>
        <tbody>
          {description && (
            <tr>
              <td className="w-1/4 font-medium py-2 px-3">{t("governance.description")}</td>
              <td className="py-2 px-3">{description}</td>
            </tr>
          )}
          <tr>
            <td className="w-1/4 font-medium py-2 px-3">{t("governance.value")}</td>
            <td className="py-2 px-3">
              <FormattedAmount value={bountyData.value.toBigInt()} />
            </td>
          </tr>
          {bountyData.fee && (
            <tr>
              <td className="w-1/4 font-medium py-2 px-3">{t("governance.fee")}</td>
              <td className="py-2 px-3">
                <FormattedAmount value={bountyData.fee.toBigInt()} />
              </td>
            </tr>
          )}
          {bountyData.proposer && (
            <tr>
              <td className="w-1/4 font-medium py-2 px-3">{t("governance.proposer")}</td>
              <td className="py-2 px-3">
                <AccountName address={bountyData.proposer.toString()} />
              </td>
            </tr>
          )}
        </tbody>
      </HTMLTable>
    </Card>
  );
}
