import { Card, Classes, Tag, Intent, Button, Icon, ProgressBar } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";
import { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import { AccountName } from "app/components/common/AccountName";
import { formatBalance } from "@polkadot/util";
import { BountyDetails } from "./BountyDetails";
import { useApi } from "app/components/Api";
import { useEffect, useState } from "react";
import { formatDuration } from "app/utils/time";

// Constants
const BLOCK_TIME_SECONDS = 60;
const DEFAULT_VOTING_PERIOD = 2880; // About 2 days with 60-second blocks

function TimeRemaining({ motion }: { motion: DeriveCollectiveProposal }) {
  const api = useApi();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);

  useEffect(() => {
    if (!api) return;

    let unsubscribe: () => void;

    const updateTime = async () => {
      try {
        // Try both council and collective modules
        const councilInstance = api.registry.getModuleInstances?.(api.runtimeVersion.specName.toString(), "council") || ["council"];
        const collectiveInstance = api.registry.getModuleInstances?.(api.runtimeVersion.specName.toString(), "collective") || ["collective"];

        // Try to get voting period from various sources
        let votingPeriod = DEFAULT_VOTING_PERIOD;

        // Try runtime constants first
        const runtimeVotingPeriod = api.consts.democracy?.votingPeriod || api.consts.council?.votingPeriod;

        // Then try module instances
        const configuredPeriod =
          runtimeVotingPeriod ||
          api.consts[councilInstance[0]]?.votingPeriod ||
          api.consts[collectiveInstance[0]]?.votingPeriod ||
          api.consts.collective?.votingPeriod;

        if (configuredPeriod) {
          try {
            votingPeriod = (configuredPeriod as unknown as { toNumber: () => number }).toNumber();
          } catch (e) {
            // Fallback to default voting period
          }
        }

        // Get the end block from the motion itself if available
        const endBlock = motion.votes?.end?.toNumber();

        const bestNumber = await api.derive.chain.bestNumber();
        const current = bestNumber.toNumber();

        const startBlock = motion.votes?.index.toNumber() || 0;
        const finalEndBlock = endBlock || startBlock + votingPeriod;

        setCurrentBlock(current);
        if (current <= finalEndBlock) {
          const remaining = finalEndBlock - current;
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(0);
        }
      } catch (error) {
        console.error("Error updating time:", error);
      }
    };

    // Initial update
    updateTime();

    // Subscribe to new blocks
    api.rpc.chain
      .subscribeNewHeads(() => {
        updateTime();
      })
      .then((u) => {
        unsubscribe = u;
      })
      .catch((error) => {
        console.error("Failed to subscribe to new blocks:", error);
      });

    return () => {
      unsubscribe?.();
    };
  }, [api, motion]);

  if (timeRemaining === null || currentBlock === null) {
    return null;
  }

  const formatTimeLeft = (blocks: number) => {
    const seconds = blocks * BLOCK_TIME_SECONDS;
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return `${days}d ${remainingHours}h left`;
    }
    if (hours > 0) {
      return `${hours}h left`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m left`;
  };

  const display = timeRemaining > 0 ? formatTimeLeft(timeRemaining) : "(ended)";

  return <span className="text-sm text-gray-500 ml-2">{display}</span>;
}

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

function StatusBar({
  motion,
  totalVotes,
  threshold,
  isThresholdReached,
}: {
  motion: DeriveCollectiveProposal;
  totalVotes: number;
  threshold: number;
  isThresholdReached: boolean;
}) {
  const { t } = useTranslation();
  const progress = threshold > 0 ? totalVotes / threshold : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Tag minimal round intent={isThresholdReached ? Intent.SUCCESS : Intent.PRIMARY}>
            #{motion.votes?.index.toString()}
          </Tag>
          <div className="h-5 w-[1px] bg-gray-300 dark:bg-gray-600" />
          <div className="flex items-center">
            <Icon icon="people" size={14} className="mr-1 text-gray-500" />
            <span className="font-medium">
              {totalVotes}/{threshold}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TimeRemaining motion={motion} />
          <div className="h-5 w-[1px] bg-gray-300 dark:bg-gray-600" />
          <span className="text-sm text-gray-500">
            {isThresholdReached ? (
              <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                <Icon icon="tick-circle" size={14} />
                {t("governance.threshold_reached")}
              </span>
            ) : (
              t("governance.votes_needed", { remaining: threshold - totalVotes })
            )}
          </span>
        </div>
      </div>
      <div className="flex items-center">
        <div className="flex-grow">
          <ProgressBar animate={false} intent={isThresholdReached ? Intent.SUCCESS : Intent.PRIMARY} value={progress} className="!h-1.5" />
        </div>
      </div>
    </div>
  );
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

  if (!motion?.proposal || !motion?.votes) return null;

  const hash = motion.hash?.toString() || "";
  const index = motion.votes.index?.toString() || "0";
  const threshold = motion.votes.threshold?.toNumber() || 0;
  const ayeVotes = motion.votes.ayes || [];
  const nayVotes = motion.votes.nays || [];
  const section = motion.proposal.section || "mock";
  const method = motion.proposal.method || "proposal";
  const args = motion.proposal.args || [];

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
        return <BountyDetails bountyId={args[0].toString()} motion={motion} type="approval" />;
      case "bounties.proposeCurator":
        return <BountyDetails bountyId={args[0].toString()} curator={args[1].toString()} fee={args[2].toBigInt()} motion={motion} type="curator" />;
      case "council.close":
        return `Close proposal with hash ${args[0].toString().slice(0, 8)}... at index #${args[1].toString()}`;
      default:
        return `${section}.${method}(${formattedArgs})`;
    }
  }

  const proposalDescription = getProposalDescription(section, method, args);

  return (
    <Card className="mb-3">
      <div className="flex justify-between items-start">
        <div className="w-full">
          <StatusBar motion={motion} totalVotes={totalVotes} threshold={threshold} isThresholdReached={isThresholdReached} />
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-6">{proposalDescription}</div>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag intent={Intent.SUCCESS} minimal className="min-w-12 text-center">
              {ayeVotes.length} {t("governance.ayes")}
            </Tag>
            <div className="flex flex-wrap gap-1">
              {ayeVotes.map((address) => (
                <Tag
                  key={address.toString()}
                  minimal
                  className={`${Classes.TEXT_SMALL} px-2 py-1.5 ${
                    address.toString() === selectedAddress ? "!bg-green-100 dark:!bg-green-900 !ring-1 !ring-green-600 dark:!ring-green-300" : ""
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
                    className={`${Classes.TEXT_SMALL} px-2 py-0.5 ${
                      address.toString() === selectedAddress ? "!bg-red-100 dark:!bg-red-900 !ring-1 !ring-red-600 dark:!ring-red-300" : ""
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
          <div>
            {!isThresholdReached ? (
              <div className="flex gap-3">
                <Button
                  intent={Intent.SUCCESS}
                  loading={votingLoading[`${hash}-true`]}
                  onClick={() => onVote(motion, true)}
                  className="min-w-[140px] !h-10"
                  icon={ayeVotes.map((a) => a.toString()).includes(selectedAddress || "") ? "tick" : undefined}
                >
                  {ayeVotes.map((a) => a.toString()).includes(selectedAddress || "") ? t("governance.ayes") : t("governance.ayes")}
                </Button>
                <Button
                  intent={Intent.DANGER}
                  loading={votingLoading[`${hash}-false`]}
                  onClick={() => onVote(motion, false)}
                  className="min-w-[140px] !h-10"
                  icon={nayVotes.map((a) => a.toString()).includes(selectedAddress || "") ? "tick" : undefined}
                >
                  {nayVotes.map((a) => a.toString()).includes(selectedAddress || "") ? t("governance.nays") : t("governance.nays")}
                </Button>
              </div>
            ) : (
              <Button
                intent={Intent.PRIMARY}
                icon="tick-circle"
                loading={closeMotionLoading[hash]}
                onClick={() => onClose(motion)}
                className="min-w-[140px] !h-10"
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
