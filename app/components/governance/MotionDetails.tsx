import { Card, Classes, Tag, Intent, Button, Icon, Spinner } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";
import { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import { AccountName } from "app/components/common/AccountName";
import { formatBalance } from "@polkadot/util";
import { BountyApproval } from "./BountyApproval";
import { useState } from "react";

interface MotionDetailsProps {
  motion: DeriveCollectiveProposal;
  isCouncilMember: boolean;
  selectedAddress?: string | null;
  onVote?: (motion: DeriveCollectiveProposal, approve: boolean) => void;
  onClose?: (motion: DeriveCollectiveProposal) => void;
  votingLoading?: { [key: string]: boolean };
  closeMotionLoading?: { [key: string]: boolean };
}

function formatProposalArgument(section: string, method: string, arg: any, index: number): string {
  // Format balance values
  if (typeof arg === "object" && arg.toBigInt) {
    return formatBalance(arg.toBigInt());
  }

  // Format addresses
  if (typeof arg === "string" && arg.startsWith("0x") && arg.length === 66) {
    return `<Address: ${arg.slice(0, 8)}...${arg.slice(-6)}>`;
  }

  // Format specific proposal types
  switch (`${section}.${method}`) {
    case "treasury.approveProposal":
    case "treasury.rejectProposal":
      if (index === 0) return `Proposal #${arg.toString()}`;
      break;
    case "treasury.proposeBounty":
      if (index === 0) return `Value: ${formatBalance(arg.toBigInt())}`;
      if (index === 1) return `Description: ${arg.toString()}`;
      if (index === 2) return `Beneficiary: ${arg.toString()}`;
      break;
    case "bounties.approveBounty":
      if (index === 0) return `Bounty #${arg.toString()}`;
      break;
    case "council.close":
      if (index === 0) return `Proposal Hash: ${arg.toString().slice(0, 8)}...`;
      if (index === 1) return `Voting Index: #${arg.toString()}`;
      break;
    // Add more specific cases as needed
  }

  // Default formatting
  return arg.toString();
}

export function MotionDetails({
  motion,
  isCouncilMember,
  selectedAddress,
  onVote,
  onClose,
  votingLoading = {},
  closeMotionLoading = {},
}: MotionDetailsProps) {
  const { t } = useTranslation();
  const [showTechDetails, setShowTechDetails] = useState(false);

  if (!motion?.proposal || !motion?.votes) return null;

  const hash = motion.hash?.toString() || "";
  const index = motion.votes.index?.toString() || "0";
  const threshold = motion.votes.threshold?.toNumber() || 0;
  const ayeVotes = motion.votes.ayes || [];
  const nayVotes = motion.votes.nays || [];
  const section = motion.proposal.section || "mock";
  const method = motion.proposal.method || "proposal";
  const args = motion.proposal.args || [];
  const proposalHash = motion.proposal.hash?.toString() || "";

  const totalVotes = ayeVotes.length + nayVotes.length;
  const isThresholdReached = totalVotes >= threshold;

  function getProposalDescription(section: string, method: string, args: any[]): string | JSX.Element {
    const formattedArgs = args.map((arg) => arg.toString()).join(", ");

    switch (`${section}.${method}`) {
      case "treasury.approveProposal":
        return `Approve Treasury Proposal #${args[0].toString()}`;
      case "treasury.rejectProposal":
        return `Reject Treasury Proposal #${args[0].toString()}`;
      case "treasury.proposeBounty":
        return (
          <div>
            Propose Bounty of {formatBalance(args[0].toBigInt())} with description: {args[1].toString()} for beneficiary:{" "}
            <AccountName address={args[2].toString()} />
          </div>
        );
      case "bounties.approveBounty":
        return <BountyApproval bountyId={args[0].toString()} motion={motion} />;
      case "council.close":
        return `Close proposal with hash ${args[0].toString().slice(0, 8)}... at index #${args[1].toString()}`;
      default:
        return `${section}.${method}(${formattedArgs})`;
    }
  }

  const proposalDescription = getProposalDescription(section, method, args);

  return (
    <Card className="mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <Tag minimal round className="mb-2">
            #{index}
          </Tag>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{proposalDescription}</div>
        </div>
        <Tag intent={isThresholdReached ? Intent.SUCCESS : Intent.PRIMARY} minimal>
          {totalVotes}/{threshold}
        </Tag>
      </div>

      <div className="mb-4">
        <Button
          minimal
          small
          onClick={() => setShowTechDetails(!showTechDetails)}
          className="mb-2"
          rightIcon={<Icon icon={showTechDetails ? "chevron-up" : "chevron-down"} />}
        >
          {t("governance.technical_info")}
        </Button>

        {showTechDetails && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div className="mb-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("governance.details")}</div>
              <div className="grid gap-2">
                {args.map((arg, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Tag minimal className="shrink-0">
                      {t("governance.parameter")} {index + 1}
                    </Tag>
                    <div className="font-mono text-sm break-all">{formatProposalArgument(section, method, arg, index)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("governance.technical_info")}</div>
              <div className="font-mono text-xs break-all text-gray-500">{proposalHash}</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Tag intent={Intent.SUCCESS} minimal className="min-w-12 text-center">
              {ayeVotes.length} {t("governance.ayes")}
            </Tag>
            <div className="flex flex-wrap gap-1">
              {ayeVotes.map((address) => (
                <Tag
                  key={address.toString()}
                  minimal
                  className={`${Classes.TEXT_SMALL} px-2 py-1.5 rounded-md ${
                    address.toString() === selectedAddress ? "!bg-green-100 dark:!bg-green-900" : ""
                  }`}
                >
                  <AccountName address={address.toString()} />
                </Tag>
              ))}
            </div>
          </div>
          {nayVotes.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag intent={Intent.DANGER} minimal className="min-w-12 text-center">
                {nayVotes.length} {t("governance.nays")}
              </Tag>
              <div className="flex flex-wrap gap-1">
                {nayVotes.map((address) => (
                  <Tag
                    key={address.toString()}
                    minimal
                    className={`${Classes.TEXT_SMALL} px-2 py-1.5 rounded-md ${
                      address.toString() === selectedAddress ? "!bg-red-100 dark:!bg-red-900" : ""
                    }`}
                  >
                    <AccountName address={address.toString()} />
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>

        {isCouncilMember && onVote && onClose && (
          <div className="flex justify-end gap-2">
            {!isThresholdReached ? (
              <div className="flex gap-2">
                <Button
                  intent={Intent.SUCCESS}
                  loading={votingLoading[`${hash}-true`]}
                  onClick={() => onVote(motion, true)}
                  className="min-w-[100px] py-2 text-base"
                >
                  {ayeVotes.map((a) => a.toString()).includes(selectedAddress || "") ? (
                    <span className="inline-flex items-center gap-4">
                      <Icon icon="tick" size={14} /> {t("governance.ayes")}
                    </span>
                  ) : (
                    t("governance.ayes")
                  )}
                </Button>
                <Button
                  intent={Intent.DANGER}
                  loading={votingLoading[`${hash}-false`]}
                  onClick={() => onVote(motion, false)}
                  className="min-w-[100px] py-2 text-base"
                >
                  {nayVotes.map((a) => a.toString()).includes(selectedAddress || "") ? (
                    <span className="inline-flex items-center gap-4">
                      <Icon icon="tick" size={14} /> {t("governance.nays")}
                    </span>
                  ) : (
                    t("governance.nays")
                  )}
                </Button>
              </div>
            ) : (
              <Button
                intent={Intent.PRIMARY}
                icon="tick-circle"
                loading={closeMotionLoading[hash]}
                onClick={() => onClose(motion)}
                className="min-w-[120px] py-2 text-base"
              >
                {t("governance.close_motion")}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
