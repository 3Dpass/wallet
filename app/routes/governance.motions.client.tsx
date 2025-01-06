import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, Elevation, Spinner, Tag, Intent, HTMLTable, Classes, Button, Switch } from "@blueprintjs/core";
import { useApi, useAccounts } from "app/components/Api";
import { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import { AccountName } from "app/components/common/AccountName";
import useToaster from "app/hooks/useToaster";
import { signAndSend, enableMockMode, disableMockMode } from "app/utils/sign";
import { AccountSelector } from "app/components/governance/AccountSelector";
import { mockVotes } from "app/utils/mock";

export default function GovernanceMotions() {
  const { t } = useTranslation();
  const api = useApi();
  const accounts = useAccounts();
  const toaster = useToaster();
  const [motions, setMotions] = useState<DeriveCollectiveProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [councilMemberAddresses, setCouncilMemberAddresses] = useState<string[]>([]);
  const [votingLoading, setVotingLoading] = useState<{ [key: string]: boolean }>({});
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);

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
      }
    }

    fetchMotions();
  }, [api, isMockMode]);

  useEffect(() => {
    async function fetchCouncilMembers() {
      if (!api) return;

      try {
        const electionsInfo = await api.derive.elections.info();
        const members = electionsInfo.members.map(([accountId]) => accountId.toString());
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

  const hasVoted = (motion: DeriveCollectiveProposal, address: string) => {
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

  const handleVote = async (motion: DeriveCollectiveProposal, approve: boolean) => {
    if (!api || !motion.votes || !selectedAddress) return;

    const account = accounts.find((a) => a.address === selectedAddress);
    if (!account) return;

    // Skip lock check in mock mode
    if (!isMockMode) {
      const isLocked = account.isLocked && !account.meta.isInjected;
      if (isLocked) {
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: t("messages.lbl_account_locked"),
        });
        return;
      }
    }

    setVotingLoading((prev) => ({ ...prev, [`${motion.hash.toString()}-${approve}`]: true }));

    try {
      const tx = api.tx.council.vote(motion.hash, motion.votes.index, approve);
      await signAndSend(tx, account, {}, async ({ status }) => {
        if (!status.isInBlock) return;

        if (isMockMode) {
          // In mock mode, update the UI immediately with the new vote
          const votes = mockVotes.get(motion.hash.toString()) || { ayes: [], nays: [] };

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
                  ayes: votes.ayes.map((a) => ({ toString: () => a, toHuman: () => a })),
                  nays: votes.nays.map((a) => ({ toString: () => a, toHuman: () => a })),
                  toString: () => `ayes: ${votes.ayes.length}, nays: ${votes.nays.length}`,
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
            intent: Intent.SUCCESS,
            message: t("messages.lbl_tx_sent"),
          });
          setVotingLoading((prev) => ({ ...prev, [`${motion.hash.toString()}-${approve}`]: false }));
        }
      });
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
      setVotingLoading((prev) => ({ ...prev, [`${motion.hash.toString()}-${approve}`]: false }));
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

  if (loading) {
    return <Spinner />;
  }

  const selectedAccount = selectedAddress ? accounts.find((a) => a.address === selectedAddress) : null;
  const isSelectedCouncilMember = selectedAddress ? isCouncilMember(selectedAddress) : false;

  return (
    <>
      <div className="flex justify-between items-center">
        <AccountSelector onAccountChange={setSelectedAddress} selectedAddress={selectedAddress} />
        {process.env.NODE_ENV === "development" && <Switch checked={isMockMode} label={t("governance.mock_mode")} onChange={handleMockModeToggle} />}
      </div>
      <Card elevation={Elevation.ONE} className="p-4">
        <h2 className={`${Classes.HEADING} mb-4`}>{t("governance.motions")}</h2>
        <HTMLTable className="w-full">
          <thead>
            <tr>
              <th className="w-16">#</th>
              <th className="w-48">{t("governance.motion")}</th>
              <th className="w-full">{t("governance.votes")}</th>
              <th className="w-24 text-right">{t("governance.threshold")}</th>
              {isSelectedCouncilMember && <th className="w-32 text-right">{t("governance.vote")}</th>}
            </tr>
          </thead>
          <tbody>
            {motions.map((motion) => {
              if (!motion?.proposal || !motion?.votes) return null;

              const hash = motion.hash?.toString() || "";
              const index = motion.votes.index?.toString() || "0";
              const threshold = motion.votes.threshold?.toNumber() || 0;
              const ayeVotes = motion.votes.ayes || [];
              const nayVotes = motion.votes.nays || [];
              const section = motion.proposal.section || "mock";
              const method = motion.proposal.method || "proposal";

              return (
                <tr key={hash}>
                  <td>
                    <Tag minimal round>
                      {index}
                    </Tag>
                  </td>
                  <td>
                    <div className={`${Classes.TEXT_LARGE} font-medium`}>
                      {section}.{method}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Tag intent={Intent.SUCCESS} minimal>
                          {ayeVotes.length} {t("governance.ayes")}
                        </Tag>
                        <div className="flex flex-wrap gap-1">
                          {ayeVotes.map((address) => (
                            <Tag key={address.toString()} minimal className={Classes.TEXT_SMALL}>
                              <AccountName address={address.toString()} />
                            </Tag>
                          ))}
                        </div>
                      </div>
                      {nayVotes.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Tag intent={Intent.DANGER} minimal>
                            {nayVotes.length} {t("governance.nays")}
                          </Tag>
                          <div className="flex flex-wrap gap-1">
                            {nayVotes.map((address) => (
                              <Tag key={address.toString()} minimal className={Classes.TEXT_SMALL}>
                                <AccountName address={address.toString()} />
                              </Tag>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="text-right">
                    <Tag intent={Intent.PRIMARY} minimal>
                      {ayeVotes.length + nayVotes.length}/{threshold}
                    </Tag>
                  </td>
                  {isSelectedCouncilMember && selectedAccount && (
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {!hasVoted(motion, selectedAccount.address) ? (
                          <div className="flex gap-2">
                            <Button
                              intent={Intent.SUCCESS}
                              icon="small-tick"
                              loading={votingLoading[`${hash}-true`]}
                              onClick={() => handleVote(motion, true)}
                              className="min-w-[80px]"
                            >
                              {t("governance.ayes")}
                            </Button>
                            <Button
                              intent={Intent.DANGER}
                              icon="small-cross"
                              loading={votingLoading[`${hash}-false`]}
                              onClick={() => handleVote(motion, false)}
                              className="min-w-[80px]"
                            >
                              {t("governance.nays")}
                            </Button>
                          </div>
                        ) : (
                          <Tag minimal intent={Intent.WARNING}>
                            {t("governance.already_voted")}
                          </Tag>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </HTMLTable>
      </Card>
    </>
  );
}
