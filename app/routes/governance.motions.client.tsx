import { Classes, Icon, Spinner, Switch } from "@blueprintjs/core";
import type { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import { useSearchParams } from "@remix-run/react";
import { lastSelectedAccountAtom } from "app/atoms";
import { useAccounts, useApi } from "app/components/Api";
import { MotionDetails } from "app/components/governance/MotionDetails";
import useToaster from "app/hooks/useToaster";
import { mockVotes } from "app/utils/mock";
import { disableMockMode, enableMockMode, signAndSend } from "app/utils/sign";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function GovernanceMotions() {
  const { t } = useTranslation();
  const api = useApi();
  const accounts = useAccounts();
  const toaster = useToaster();
  const [motions, setMotions] = useState<DeriveCollectiveProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [councilMemberAddresses, setCouncilMemberAddresses] = useState<
    string[]
  >([]);
  const [votingLoading, setVotingLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [selectedAddress, _setSelectedAddress] = useAtom(
    lastSelectedAccountAtom
  );
  const [isMockMode, setIsMockMode] = useState(false);
  const [closeMotionLoading, setCloseMotionLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [searchParams] = useSearchParams();
  const highlightMotionHash = searchParams.get("highlight");
  const highlightedMotionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      highlightMotionHash &&
      highlightedMotionRef.current &&
      !loading &&
      detailsLoaded
    ) {
      const timeoutId = setTimeout(() => {
        highlightedMotionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [highlightMotionHash, loading, detailsLoaded]);

  useEffect(() => {
    if (isMockMode && motions.length === 0) {
      const mockMotion = {
        hash: { toString: () => "0xmockhash" },
        votes: {
          index: { toString: () => "0" },
          threshold: { toNumber: () => 3 },
          ayes: [],
          nays: [],
          toString: () => "mock votes",
        },
        proposal: {
          section: "mock",
          method: "proposal",
          toString: () => "mock.proposal",
        },
      } as unknown as DeriveCollectiveProposal;

      mockVotes.set("0xmockhash", { ayes: [], nays: [] });
      setMotions([mockMotion]);
      setLoading(false);
    }
  }, [isMockMode, motions.length]);

  useEffect(() => {
    async function fetchMotions() {
      if (!api) return;

      try {
        if (isMockMode) {
          const proposals = await api.derive.council.proposals();
          setMotions(proposals);
        } else {
          const proposals = await api.derive.council.proposals();
          setMotions(proposals);
        }
      } catch (error) {
        console.error("Error fetching motions:", error);
      } finally {
        setLoading(false);
        setTimeout(() => setDetailsLoaded(true), 500);
      }
    }

    fetchMotions();
    return () => setDetailsLoaded(false);
  }, [api, isMockMode]);

  useEffect(() => {
    async function fetchCouncilMembers() {
      if (!api) return;

      try {
        const electionsInfo = await api.derive.elections.info();
        const members = electionsInfo.members.map(([accountId]) =>
          accountId.toString()
        );
        setCouncilMemberAddresses(members);
      } catch (error) {
        console.error("Error fetching council members:", error);
      }
    }

    fetchCouncilMembers();
  }, [api]);

  const isCouncilMember = (address: string) => {
    return councilMemberAddresses.includes(address);
  };

  const _hasVoted = (motion: DeriveCollectiveProposal, address: string) => {
    if (!motion.votes) return false;

    if (isMockMode) {
      // In mock mode, check the mockVotes directly
      const votes = mockVotes.get(motion.hash.toString());
      if (!votes) return false;
      return votes.ayes.includes(address) || votes.nays.includes(address);
    }

    // In real mode, check the motion votes
    const ayeVotes = motion.votes.ayes?.map((a) => a.toString()) || [];
    const nayVotes = motion.votes.nays?.map((a) => a.toString()) || [];
    return ayeVotes.includes(address) || nayVotes.includes(address);
  };

  const handleVote = async (
    motion: DeriveCollectiveProposal,
    approve: boolean
  ) => {
    if (!api || !motion.votes || !selectedAddress) return;

    const account = accounts.find((a) => a.address === selectedAddress);
    if (!account) return;

    // Skip lock check in mock mode
    if (!isMockMode) {
      const isLocked = account.isLocked && !account.meta.isInjected;
      if (isLocked) {
        toaster.show({
          icon: "error",
          intent: "danger",
          message: t("messages.lbl_account_locked"),
        });
        return;
      }
    }

    setVotingLoading((prev) => ({
      ...prev,
      [`${motion.hash.toString()}-${approve}`]: true,
    }));

    try {
      const tx = api.tx.council.vote(motion.hash, motion.votes.index, approve);
      await signAndSend(tx, account, {}, async ({ status }) => {
        if (!status.isInBlock) return;

        if (isMockMode) {
          // In mock mode, update the UI immediately with the new vote
          const votes = mockVotes.get(motion.hash.toString()) || {
            ayes: [],
            nays: [],
          };

          // Remove the address from both arrays first
          votes.ayes = votes.ayes.filter((a) => a !== account.address);
          votes.nays = votes.nays.filter((a) => a !== account.address);

          // Add to the appropriate array
          if (approve) {
            votes.ayes.push(account.address);
          } else {
            votes.nays.push(account.address);
          }

          mockVotes.set(motion.hash.toString(), votes);

          const updatedMotions = motions.map((m) => {
            if (m.hash.toString() === motion.hash.toString()) {
              return {
                ...m,
                votes: {
                  ...m.votes,
                  ayes: votes.ayes.map((a) => ({
                    toString: () => a,
                    toHuman: () => a,
                  })),
                  nays: votes.nays.map((a) => ({
                    toString: () => a,
                    toHuman: () => a,
                  })),
                  toString: () =>
                    `ayes: ${votes.ayes.length}, nays: ${votes.nays.length}`,
                },
              } as unknown as DeriveCollectiveProposal;
            }
            return m;
          });
          setMotions(updatedMotions);
        } else {
          // In real mode, fetch the updated motions from the API
          const proposals = await api.derive.council.proposals();
          setMotions(proposals);
        }

        if (status.isFinalized) {
          toaster.show({
            icon: "tick",
            intent: "success",
            message: t("messages.lbl_tx_sent"),
          });
          setVotingLoading((prev) => ({
            ...prev,
            [`${motion.hash.toString()}-${approve}`]: false,
          }));
        }
      });
    } catch (e: unknown) {
      toaster.show({
        icon: "error",
        intent: "danger",
        message: e instanceof Error ? e.message : String(e),
      });
      setVotingLoading((prev) => ({
        ...prev,
        [`${motion.hash.toString()}-${approve}`]: false,
      }));
    }
  };

  const handleMockModeToggle = () => {
    if (!isMockMode) {
      enableMockMode();
      setCouncilMemberAddresses(accounts.map((a) => a.address));
    } else {
      disableMockMode();
      setMotions([]);
      mockVotes.clear();
    }
    setIsMockMode(!isMockMode);
  };

  const handleCloseMotion = async (motion: DeriveCollectiveProposal) => {
    if (!api || !motion.votes || !selectedAddress) return;

    const account = accounts.find((a) => a.address === selectedAddress);
    if (!account) return;

    const hash = motion.hash.toString();
    setCloseMotionLoading((prev) => ({ ...prev, [hash]: true }));

    try {
      if (!motion.proposal) {
        throw new Error("No proposal data available");
      }

      // Check if the motion has failed (not enough votes)
      const hasFailed =
        motion.votes.ayes.length < motion.votes.threshold.toNumber();

      // Calculate weight and length
      const encodedLength = motion.proposal.encodedLength || 0;
      const weight = BigInt(1_000_000_000);

      // If failed, use 0 for both weight and length bounds
      const params = hasFailed
        ? [motion.hash, motion.votes.index, 0, 0]
        : [motion.hash, motion.votes.index, weight, encodedLength];

      const tx = api.tx.council.close(...params);
      await signAndSend(tx, account, {}, async ({ status }) => {
        if (!status.isInBlock) return;

        if (isMockMode) {
          setMotions(
            motions.filter((m) => m.hash.toString() !== motion.hash.toString())
          );
        } else {
          const proposals = await api.derive.council.proposals();
          setMotions(proposals);
        }

        if (status.isFinalized) {
          toaster.show({
            icon: "tick",
            intent: "success",
            message: t("messages.lbl_tx_sent"),
          });
          setCloseMotionLoading((prev) => ({ ...prev, [hash]: false }));
        }
      });
    } catch (e: unknown) {
      toaster.show({
        icon: "error",
        intent: "danger",
        message: e instanceof Error ? e.message : String(e),
      });
      setCloseMotionLoading((prev) => ({ ...prev, [hash]: false }));
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (motions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center text-gray-500">
        <Icon icon="inbox" iconSize={50} className="mb-4" />
        <div className="text-lg">{t("governance.no_motions")}</div>
      </div>
    );
  }

  const isSelectedCouncilMember = selectedAddress
    ? isCouncilMember(selectedAddress)
    : false;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className={Classes.HEADING}>{t("governance.motions")}</h2>
        {process.env.NODE_ENV === "development" && (
          <Switch
            checked={isMockMode}
            label={t("governance.mock_mode")}
            onChange={handleMockModeToggle}
          />
        )}
      </div>
      <div className="space-y-3">
        {motions
          .slice()
          .sort((a, b) => {
            const indexA = a.votes?.index?.toNumber() ?? 0;
            const indexB = b.votes?.index?.toNumber() ?? 0;
            return indexB - indexA;
          })
          .map((motion) => (
            <div
              key={motion.hash?.toString()}
              ref={
                motion.hash?.toString() === highlightMotionHash
                  ? highlightedMotionRef
                  : undefined
              }
            >
              <MotionDetails
                motion={motion}
                isCouncilMember={isSelectedCouncilMember}
                selectedAddress={selectedAddress}
                onVote={handleVote}
                onClose={handleCloseMotion}
                votingLoading={votingLoading}
                closeMotionLoading={closeMotionLoading}
                highlight={motion.hash?.toString() === highlightMotionHash}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
