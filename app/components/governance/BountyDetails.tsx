import { Spinner, H4, Tag, Intent, HTMLTable } from "@blueprintjs/core";
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
  type: "approval" | "curator" | "close";
  curator?: string;
  fee?: bigint;
  showHeader?: boolean;
}

interface BountyStep {
  label: string;
  status: "complete" | "current" | "upcoming";
}

function BountyProgress({ currentStatus }: { currentStatus: string }) {
  const { t } = useTranslation();

  // Define the order of statuses in the lifecycle
  const statusOrder = {
    Proposed: 0,
    Approved: 1,
    Funded: 2,
    CuratorProposed: 3,
    Active: 4,
    PendingPayout: 5,
  };

  // Get the current status index
  const currentIndex = statusOrder[currentStatus as keyof typeof statusOrder] || 0;

  const steps: BountyStep[] = [
    {
      label: t("governance.bounty_step_proposed"),
      status: currentIndex === 0 ? "current" : currentIndex > 0 ? "complete" : "upcoming",
    },
    {
      label: t("governance.bounty_step_approved"),
      status: currentIndex === 1 ? "current" : currentIndex > 1 ? "complete" : "upcoming",
    },
    {
      label: t("governance.bounty_step_funded"),
      status: currentIndex === 2 ? "current" : currentIndex > 2 ? "complete" : "upcoming",
    },
    {
      label: t("governance.bounty_step_curator_proposed"),
      status: currentIndex === 3 ? "current" : currentIndex > 3 ? "complete" : "upcoming",
    },
    {
      label: t("governance.bounty_step_active"),
      status: currentIndex === 4 ? "current" : currentIndex > 4 ? "complete" : "upcoming",
    },
    {
      label: t("governance.bounty_step_payout"),
      status: currentIndex === 5 ? "current" : currentIndex > 5 ? "complete" : "upcoming",
    },
  ];

  return (
    <div className="flex items-center w-full my-4 relative">
      <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-200 dark:bg-gray-700" />
      {steps.map((step, index) => (
        <div key={index} className="relative flex-1 flex flex-col items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10
              ${
                step.status === "complete"
                  ? "bg-green-500 text-white"
                  : step.status === "current"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}
          >
            {step.status === "complete" ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <span className="text-sm">{index + 1}</span>
            )}
          </div>
          <div className="text-xs mt-2 text-center text-gray-600 dark:text-gray-400">{step.label}</div>
        </div>
      ))}
    </div>
  );
}

export function BountyDetails({ bountyId, motion, type, curator, fee, showHeader = true }: BountyDetailsProps) {
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
        console.log(
          "Bounty data:",
          JSON.stringify(unwrapped, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2)
        );

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

  const title = {
    approval: "Approve Bounty",
    curator: "Propose Curator for Bounty",
    close: "Close Bounty",
  }[type];

  if (loading) {
    return (
      <div>
        <H4>
          {title} #{bountyId}
        </H4>
        <div className="flex items-center gap-2 mt-2">
          <Spinner size={16} /> {t("common.loading")}
        </div>
      </div>
    );
  }

  if (!bountyData) {
    return (
      <div>
        <H4>
          {title} #{bountyId}
        </H4>
        <Tag intent={Intent.DANGER} className="mt-2">
          {t("governance.bounty_not_found")}
        </Tag>
      </div>
    );
  }

  const getStatusIntent = (status: { type: string }) => {
    switch (status.type) {
      case "Active":
        return Intent.SUCCESS;
      case "PendingPayout":
        return Intent.WARNING;
      case "Proposed":
        return Intent.PRIMARY;
      case "CuratorProposed":
        return Intent.PRIMARY;
      case "Funded":
        return Intent.SUCCESS;
      default:
        return Intent.NONE;
    }
  };

  return (
    <div className="max-w-4xl w-full">
      {showHeader && (
        <div className="mb-3">
          <H4>
            {title} #{bountyId}
          </H4>
        </div>
      )}
      {bountyData?.status && <BountyProgress currentStatus={bountyData.status.type} />}
      <HTMLTable striped className="w-full">
        <tbody>
          {bountyData?.status && (
            <tr>
              <td className="text-gray-500 whitespace-nowrap pr-8 w-0">{t("governance.bounty_status")}</td>
              <td>
                <Tag intent={getStatusIntent(bountyData.status)}>{bountyData.status.type}</Tag>
              </td>
            </tr>
          )}
          {bountyData?.status &&
            ((bountyData.status.type === "CuratorProposed" && bountyData.status.asCuratorProposed?.curator) ||
              (bountyData.status.type === "Active" && bountyData.status.asActive?.curator) ||
              (bountyData.status.type === "PendingPayout" && bountyData.status.asPendingPayout?.curator)) && (
              <tr>
                <td className="text-gray-500 whitespace-nowrap pr-8 w-0">{t("governance.curator")}</td>
                <td>
                  <AccountName
                    address={(
                      (bountyData.status.type === "CuratorProposed" && bountyData.status.asCuratorProposed?.curator) ||
                      (bountyData.status.type === "Active" && bountyData.status.asActive?.curator) ||
                      (bountyData.status.type === "PendingPayout" && bountyData.status.asPendingPayout?.curator)
                    ).toString()}
                  />
                </td>
              </tr>
            )}
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
    </div>
  );
}
