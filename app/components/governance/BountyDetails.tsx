import { Card, Spinner, H4, Tag, Intent, HTMLTable } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";
import { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import { AccountName } from "app/components/common/AccountName";
import { FormattedAmount } from "app/components/common/FormattedAmount";
import type { Option } from "@polkadot/types";
import { useApi } from "app/components/Api";
import { useEffect, useState } from "react";
import { hexToString } from "@polkadot/util";

interface BountyDetailsProps {
  bountyId: string;
  motion: DeriveCollectiveProposal;
  type: "approval" | "curator";
  curator?: string;
  fee?: bigint;
}

export function BountyDetails({ bountyId, motion, type, curator, fee }: BountyDetailsProps) {
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

  const title = type === "approval" ? "Approve Bounty" : "Propose Curator for Bounty";

  if (loading) {
    return (
      <Card>
        <H4>
          {title} #{bountyId}
        </H4>
        <div className="flex items-center gap-2 mt-2">
          <Spinner size={16} /> {t("common.loading")}
        </div>
      </Card>
    );
  }

  if (!bountyData) {
    return (
      <Card>
        <H4>
          {title} #{bountyId}
        </H4>
        <Tag intent={Intent.DANGER} className="mt-2">
          {t("governance.bounty_not_found")}
        </Tag>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl w-full">
      <div className="mb-3">
        <H4>
          {title} #{bountyId}
        </H4>
      </div>
      <HTMLTable striped className="w-full">
        <tbody>
          {description && (
            <tr>
              <td className="text-gray-500 whitespace-nowrap pr-8 w-0">{t("governance.description")}</td>
              <td>{description}</td>
            </tr>
          )}
          {type === "curator" && curator && (
            <tr>
              <td className="text-gray-500 whitespace-nowrap pr-8 w-0">{t("governance.curator")}</td>
              <td>
                <AccountName address={curator} />
              </td>
            </tr>
          )}
          {type === "curator" && fee !== undefined && (
            <tr>
              <td className="text-gray-500 whitespace-nowrap pr-8 w-0">{t("governance.curator_fee")}</td>
              <td>
                <FormattedAmount value={fee} />
              </td>
            </tr>
          )}
          <tr>
            <td className="text-gray-500 whitespace-nowrap pr-8 w-0">{type === "approval" ? t("governance.value") : t("governance.bounty_value")}</td>
            <td>
              <FormattedAmount value={bountyData.value.toBigInt()} />
            </td>
          </tr>
          {bountyData.fee && type === "approval" && (
            <tr>
              <td className="text-gray-500 whitespace-nowrap pr-8 w-0">{t("governance.fee")}</td>
              <td>
                <FormattedAmount value={bountyData.fee.toBigInt()} />
              </td>
            </tr>
          )}
          {bountyData.proposer && (
            <tr>
              <td className="text-gray-500 whitespace-nowrap pr-8 w-0">{t("governance.proposer")}</td>
              <td>
                <AccountName address={bountyData.proposer.toString()} />
              </td>
            </tr>
          )}
        </tbody>
      </HTMLTable>
    </Card>
  );
}