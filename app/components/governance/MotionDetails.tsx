import {
  Button,
  Card,
  Icon,
  Intent,
  ProgressBar,
  Tag,
} from "@blueprintjs/core";
import type { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import type { Balance } from "@polkadot/types/interfaces";
import type { Codec } from "@polkadot/types/types";
import { formatBalance } from "@polkadot/util";
import { useApi } from "app/components/Api";
import { AccountName } from "app/components/common/AccountName";
import useToaster from "app/hooks/useToaster";
import { formatTimeLeft } from "app/utils/time";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BountyDetails } from "./BountyDetails";

// Constants
const DEFAULT_VOTING_PERIOD = 2880; // About 2 days with 60-second blocks

// Custom hook to calculate time remaining for a motion
function useTimeRemaining(motion: DeriveCollectiveProposal): {
  timeRemaining: number | null;
  currentBlock: number | null;
} {
  const api = useApi();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);

  useEffect(() => {
    if (!api) return;

    let unsubscribe: () => void;

    const updateTime = async () => {
      try {
        // Try both council and collective modules
        const councilInstance = api.registry.getModuleInstances?.(
          api.runtimeVersion.specName.toString(),
          "council"
        ) || ["council"];
        const collectiveInstance = api.registry.getModuleInstances?.(
          api.runtimeVersion.specName.toString(),
          "collective"
        ) || ["collective"];

        // Try to get voting period from various sources
        let votingPeriod = DEFAULT_VOTING_PERIOD;

        // Try runtime constants first
        const runtimeVotingPeriod =
          api.consts.democracy?.votingPeriod ||
          api.consts.council?.votingPeriod;

        // Then try module instances
        const configuredPeriod =
          runtimeVotingPeriod ||
          api.consts[councilInstance[0]]?.votingPeriod ||
          api.consts[collectiveInstance[0]]?.votingPeriod ||
          api.consts.collective?.votingPeriod;

        if (configuredPeriod) {
          try {
            votingPeriod = (
              configuredPeriod as unknown as { toNumber: () => number }
            ).toNumber();
          } catch (_e) {
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

  return { timeRemaining, currentBlock };
}

// Component to display time remaining
function TimeRemaining({
  motion,
  t,
}: {
  motion: DeriveCollectiveProposal;
  t: (key: string) => string;
}) {
  const { timeRemaining } = useTimeRemaining(motion);

  if (timeRemaining === null) {
    return null;
  }

  const display =
    timeRemaining > 0 ? `${formatTimeLeft(timeRemaining, t)} left` : "(ended)";

  return (
    <div className="flex items-center">
      <Icon icon="time" size={14} className="mr-1 text-gray-500" />
      <span className="font-medium">{display}</span>
    </div>
  );
}

// Component to render proposal description
function ProposalDescription({
  section,
  method,
  args,
  motion,
}: {
  section: string;
  method: string;
  args: Codec[];
  motion: DeriveCollectiveProposal;
}): JSX.Element {
  const formattedArgs = args.map((arg) => arg.toString()).join(", ");

  switch (`${section}.${method}`) {
    case "treasury.approveProposal":
      return (
        <span className="flex items-center gap-2">
          <Icon
            icon="tick-circle"
            className="text-green-600 dark:text-green-400"
          />
          <span>Approve Treasury Proposal #{args[0].toString()}</span>
        </span>
      );
    case "treasury.rejectProposal":
      return (
        <span className="flex items-center gap-2">
          <Icon
            icon="cross-circle"
            className="text-red-600 dark:text-red-400"
          />
          <span>Reject Treasury Proposal #{args[0].toString()}</span>
        </span>
      );
    case "treasury.proposeBounty":
      return (
        <div className="flex items-center gap-2">
          <Icon
            icon="new-object"
            className="text-blue-600 dark:text-blue-400"
          />
          <div>
            Propose Bounty of {formatBalance((args[0] as Balance).toBigInt())}{" "}
            with description: {args[1].toString()} for beneficiary:{" "}
            <AccountName address={args[2].toString()} />
          </div>
        </div>
      );
    case "bounties.approveBounty":
      return (
        <BountyDetails
          bountyId={args[0].toString()}
          motion={motion}
          type="approval"
        />
      );
    case "bounties.closeBounty":
      return (
        <BountyDetails
          bountyId={args[0].toString()}
          motion={motion}
          type="close"
        />
      );
    case "bounties.proposeCurator":
      return (
        <BountyDetails
          bountyId={args[0].toString()}
          curator={args[1].toString()}
          fee={(args[2] as Balance).toBigInt()}
          motion={motion}
          type="curator"
        />
      );
    case "council.close":
      return (
        <span className="flex items-center gap-2">
          <Icon icon="archive" className="text-gray-600 dark:text-gray-400" />
          <span>
            Close proposal with hash {args[0].toString().slice(0, 8)}... at
            index #{args[1].toString()}
          </span>
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-2">
          <Icon
            icon="code-block"
            className="text-gray-600 dark:text-gray-400"
          />
          <span>{`${section}.${method}(${formattedArgs})`}</span>
        </span>
      );
  }
}

// Component to display voters list
function VotersList({
  ayeVotes,
  nayVotes,
  selectedAddress,
}: {
  ayeVotes: string[];
  nayVotes: string[];
  selectedAddress?: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {ayeVotes.map((address) => (
        <div
          key={address}
          className={`inline-flex items-center rounded px-2 py-1.5 text-sm bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300 ${
            address === selectedAddress
              ? "!bg-green-100 dark:!bg-green-900 !ring-1 !ring-green-600 dark:!ring-green-300"
              : ""
          }`}
        >
          <AccountName address={address} />
        </div>
      ))}
      {nayVotes.map((address) => (
        <div
          key={address}
          className={`inline-flex items-center rounded px-2 py-1.5 text-sm bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300 ${
            address === selectedAddress
              ? "!bg-red-100 dark:!bg-red-900 !ring-1 !ring-red-600 dark:!ring-red-300"
              : ""
          }`}
        >
          <AccountName address={address} />
        </div>
      ))}
    </div>
  );
}

// Component for voting buttons
function VotingButtons({
  motion,
  onVote,
  onClose,
  timeRemaining,
  isThresholdReached,
  hash,
  selectedAddress,
  ayeVotes,
  nayVotes,
  votingLoading,
  closeMotionLoading,
}: {
  motion: DeriveCollectiveProposal;
  onVote: (motion: DeriveCollectiveProposal, approve: boolean) => void;
  onClose: (motion: DeriveCollectiveProposal) => void;
  timeRemaining: number | null;
  isThresholdReached: boolean;
  hash: string;
  selectedAddress?: string | null;
  ayeVotes: string[];
  nayVotes: string[];
  votingLoading: { [key: string]: boolean };
  closeMotionLoading: { [key: string]: boolean };
}) {
  const { t } = useTranslation();

  if (isThresholdReached || timeRemaining === 0) {
    return (
      <Button
        intent={Intent.PRIMARY}
        icon="tick-circle"
        loading={closeMotionLoading[hash]}
        onClick={() => onClose(motion)}
        className="min-w-[140px] !h-10"
      >
        {t("governance.close_motion")}
      </Button>
    );
  }

  return (
    <div className="flex gap-3">
      <Button
        intent={Intent.SUCCESS}
        loading={votingLoading[`${hash}-true`]}
        onClick={() => onVote(motion, true)}
        className="min-w-[140px] !h-10"
        text={t("governance.ayes")}
        icon={ayeVotes.includes(selectedAddress || "") ? "tick" : undefined}
        disabled={ayeVotes.includes(selectedAddress || "")}
      />
      <Button
        intent={Intent.DANGER}
        loading={votingLoading[`${hash}-false`]}
        onClick={() => onVote(motion, false)}
        className="min-w-[140px] !h-10"
        text={t("governance.nays")}
        icon={nayVotes.includes(selectedAddress || "") ? "tick" : undefined}
        disabled={nayVotes.includes(selectedAddress || "")}
      />
    </div>
  );
}

// Status bar component
function StatusBar({
  motion,
  totalVotes,
  threshold,
  isThresholdReached,
  onShare,
}: {
  motion: DeriveCollectiveProposal;
  totalVotes: number;
  threshold: number;
  isThresholdReached: boolean;
  onShare: () => void;
}) {
  const { t } = useTranslation();
  const progress = threshold > 0 ? totalVotes / threshold : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Tag
              minimal
              round
              intent={isThresholdReached ? Intent.SUCCESS : Intent.PRIMARY}
            >
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
            <TimeRemaining motion={motion} t={t} />
            <div className="h-5 w-[1px] bg-gray-300 dark:bg-gray-600" />
            <span className="text-sm text-gray-500">
              {isThresholdReached ? (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Icon icon="tick-circle" size={14} />
                  {t("governance.threshold_reached")}
                </span>
              ) : (
                t("governance.votes_needed", {
                  remaining: threshold - totalVotes,
                })
              )}
            </span>
          </div>
        </div>
        <Button
          small
          minimal
          icon="share"
          onClick={onShare}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title={t("commons.lbl_btn_share")}
        />
      </div>
      <div className="flex items-center">
        <div className="flex-grow">
          <ProgressBar
            animate={false}
            stripes={false}
            intent={isThresholdReached ? Intent.SUCCESS : Intent.PRIMARY}
            value={progress}
            className="!h-1.5"
          />
        </div>
      </div>
    </div>
  );
}

// Types for props
interface MotionDetailsProps {
  motion: DeriveCollectiveProposal;
  isCouncilMember: boolean;
  selectedAddress?: string | null;
  onVote?: (motion: DeriveCollectiveProposal, approve: boolean) => void;
  onClose?: (motion: DeriveCollectiveProposal) => void;
  votingLoading?: { [key: string]: boolean };
  closeMotionLoading?: { [key: string]: boolean };
  highlight?: boolean;
}

// Main component
export function MotionDetails({
  motion,
  isCouncilMember,
  selectedAddress,
  onVote,
  onClose,
  votingLoading = {},
  closeMotionLoading = {},
  highlight = false,
}: MotionDetailsProps) {
  const { t } = useTranslation();
  const toaster = useToaster();
  const { timeRemaining } = useTimeRemaining(motion);

  if (!motion?.proposal || !motion?.votes) return null;

  const hash = motion.hash?.toString() || "";
  const threshold = motion.votes.threshold?.toNumber() || 0;
  const ayeVotes = motion.votes.ayes.map((a) => a.toString()) || [];
  const nayVotes = motion.votes.nays.map((a) => a.toString()) || [];
  const section = motion.proposal.section || "mock";
  const method = motion.proposal.method || "proposal";
  const args = motion.proposal.args || [];

  const totalVotes = ayeVotes.length + nayVotes.length;
  const isThresholdReached = totalVotes >= threshold;

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("highlight", hash);
    navigator.clipboard.writeText(url.toString()).then(() => {
      toaster.show({
        icon: "tick",
        intent: "success",
        message: t("messages.lbl_copied_to_clipboard"),
      });
    });
  };

  return (
    <Card
      className={`mb-3 ${highlight ? "ring-4 ring-blue-500 dark:ring-blue-400" : ""}`}
    >
      <div className="flex justify-between items-start">
        <div className="w-full">
          <StatusBar
            motion={motion}
            totalVotes={totalVotes}
            threshold={threshold}
            isThresholdReached={isThresholdReached}
            onShare={handleShare}
          />
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-6">
            <ProposalDescription
              section={section}
              method={method}
              args={args}
              motion={motion}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              <Tag
                intent={Intent.SUCCESS}
                minimal
                className="min-w-12 text-center"
              >
                {ayeVotes.length} {t("governance.ayes")}
              </Tag>
              <Tag
                intent={Intent.DANGER}
                minimal
                className="min-w-12 text-center"
              >
                {nayVotes.length} {t("governance.nays")}
              </Tag>
            </div>
          </div>
          <VotersList
            ayeVotes={ayeVotes}
            nayVotes={nayVotes}
            selectedAddress={selectedAddress}
          />
        </div>

        {isCouncilMember && onVote && onClose && (
          <div className="flex justify-center">
            <VotingButtons
              motion={motion}
              onVote={onVote}
              onClose={onClose}
              timeRemaining={timeRemaining}
              isThresholdReached={isThresholdReached}
              hash={hash}
              selectedAddress={selectedAddress}
              ayeVotes={ayeVotes}
              nayVotes={nayVotes}
              votingLoading={votingLoading}
              closeMotionLoading={closeMotionLoading}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
