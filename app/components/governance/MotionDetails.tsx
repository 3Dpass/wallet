import { Card, Classes, Tag, Intent, Button, Icon } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";
import { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import { AccountName } from "app/components/common/AccountName";
import { formatBalance } from "@polkadot/util";
import { BountyApproval } from "./BountyApproval";
import { BountyCuratorProposal } from "./BountyCuratorProposal";
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
        return <BountyApproval bountyId={args[0].toString()} motion={motion} />;
      case "bounties.proposeCurator":
        return <BountyCuratorProposal bountyId={args[0].toString()} curator={args[1].toString()} fee={args[2].toBigInt()} motion={motion} />;
      case "council.close":
        return `Close proposal with hash ${args[0].toString().slice(0, 8)}... at index #${args[1].toString()}`;
      default:
        return `${section}.${method}(${formattedArgs})`;
    }
  }

  const proposalDescription = getProposalDescription(section, method, args);

  return (
    <Card className="mb-3">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tag minimal round>
              #{index}
            </Tag>
            <Tag intent={isThresholdReached ? Intent.SUCCESS : Intent.PRIMARY} minimal>
              {totalVotes}/{threshold}
            </Tag>
            <TimeRemaining motion={motion} />
            <span className="text-sm text-gray-500">
              {isThresholdReached ? t("governance.threshold_reached") : t("governance.votes_needed", { remaining: threshold - totalVotes })}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">{proposalDescription}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="space-y-1 pt-3">
          <div className="flex items-center gap-2">
            <Tag intent={Intent.SUCCESS} minimal className="min-w-12 text-center">
              {ayeVotes.length} {t("governance.ayes")}
            </Tag>
            <div className="flex flex-wrap gap-1">
              {ayeVotes.map((address) => (
                <Tag
                  key={address.toString()}
                  minimal
                  className={`${Classes.TEXT_SMALL} px-2 py-1 ${address.toString() === selectedAddress ? "!bg-green-100 dark:!bg-green-900" : ""}`}
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
                    className={`${Classes.TEXT_SMALL} px-2 py-1 ${address.toString() === selectedAddress ? "!bg-red-100 dark:!bg-red-900" : ""}`}
                  >
                    <AccountName address={address.toString()} />
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>

        {isCouncilMember && onVote && onClose && (
          <div className="flex justify-start gap-2 pt-6">
            {!isThresholdReached ? (
              <div className="flex gap-2">
                <Button intent={Intent.SUCCESS} loading={votingLoading[`${hash}-true`]} onClick={() => onVote(motion, true)} className="min-w-[100px]">
                  {ayeVotes.map((a) => a.toString()).includes(selectedAddress || "") ? (
                    <span className="inline-flex items-center gap-2">
                      <Icon icon="tick" size={14} /> {t("governance.ayes")}
                    </span>
                  ) : (
                    t("governance.ayes")
                  )}
                </Button>
                <Button intent={Intent.DANGER} loading={votingLoading[`${hash}-false`]} onClick={() => onVote(motion, false)} className="min-w-[100px]">
                  {nayVotes.map((a) => a.toString()).includes(selectedAddress || "") ? (
                    <span className="inline-flex items-center gap-2">
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
                className="min-w-[120px]"
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
