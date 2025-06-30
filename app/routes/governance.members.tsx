import { Classes, HTMLTable, Intent, Spinner, Tag, Button } from "@blueprintjs/core";
import type {
  DeriveCouncilVotes,
  DeriveElectionsInfo,
} from "@polkadot/api-derive/types";
import type { AccountId } from "@polkadot/types/interfaces";
import { formatBalance } from "@polkadot/util";
import {
  AccountName,
  extractIdentity,
} from "app/components/common/AccountName";
import { CircularProgress } from "app/components/common/CircularProgress";
import { formatTimeLeft } from "app/utils/time";
import { useEffect, useState, useCallback, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../components/Api";
import type { Option, Vec } from "@polkadot/types";
import DialogSubmitCandidacy from "../components/dialogs/DialogSubmitCandidacy";
import DialogVote from "../components/dialogs/DialogVote";
import DialogUnvoteAll from "../components/dialogs/DialogUnvoteAll";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "app/atoms";

interface CouncilMember {
  address: string;
  identity?: {
    display: string;
    parent?: string;
    isGood: boolean;
    isBad: boolean;
  };
  votes: number;
  balance: string;
}

type RunnerUp = { who: string; stake: string; deposit: string };
type CandidateTuple = [string, string];
interface MyVotingInfo {
  votes: string[];
  stake: string;
  deposit: string;
}

const transformVotes = (
  entries: DeriveCouncilVotes
): Record<string, AccountId[]> =>
  entries.reduce<Record<string, AccountId[]>>((result: Record<string, AccountId[]>, [voter, { votes }]: [AccountId, { votes: AccountId[] }]) => {
    for (const candidate of votes) {
      const address = candidate.toString();

      if (!result[address]) {
        result[address] = [];
      }

      result[address].push(voter);
    }

    return result;
  }, {});

export default function GovernanceMembers() {
  const { t } = useTranslation();
  const api = useApi();
  const [councilMembers, setCouncilMembers] = useState<CouncilMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [electionsInfo, setElectionsInfo] =
    useState<DeriveElectionsInfo | null>(null);
  const [allVotes, setAllVotes] = useState<Record<string, AccountId[]>>({});
  const [termProgress, setTermProgress] = useState<{
    current: number;
    total: number;
    blockNumber: number;
    mod: number;
  } | null>(null);
  const [prime, setPrime] = useState<string | null>(null);
  const [runnersUp, setRunnersUp] = useState<RunnerUp[]>([]);
  const [candidates, setCandidates] = useState<{ address: string; stake: string }[]>([]);
  const [showCandidacyDialog, setShowCandidacyDialog] = useState(false);
  const [votingMode, setVotingMode] = useState(false);
  const [selectedVotes, setSelectedVotes] = useState<string[]>([]);
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showUnvoteAllDialog, setShowUnvoteAllDialog] = useState(false);
  const [lastSelectedAccount] = useAtom(lastSelectedAccountAtom);
  const [myVotes, setMyVotes] = useState<MyVotingInfo | null>(null);

  useEffect(() => {
    if (!api) return;

    api.derive.elections
      .info()
      .then((info) => {
        setElectionsInfo(info);
      })
      .catch(console.error);
  }, [api]);

  useEffect(() => {
    if (!api) return;

    api.derive.council
      .votes()
      .then((votes) => {
        setAllVotes(transformVotes(votes));
      })
      .catch(console.error);
  }, [api]);

  useEffect(() => {
    async function fetchTermProgress() {
      if (!api) return;

      try {
        // Try all possible module paths for term duration
        const termDuration =
          api.consts.elections?.termDuration ||
          api.consts.phragmenElection?.termDuration ||
          api.consts.electionsPhragmen?.termDuration;

        const blockNumber = await api.derive.chain.bestNumber();

        if (termDuration) {
          const total = Number.parseInt(termDuration.toString());
          const current = Number.parseInt(blockNumber.toString());
          const mod = current % total;
          const remaining = total - mod;

          setTermProgress({
            current: remaining,
            total,
            blockNumber: current,
            mod,
          });
        }
      } catch (error) {
        console.error("Error calculating term progress:", error);
      }
    }

    fetchTermProgress();
  }, [api]);

  useEffect(() => {
    async function fetchCouncilData() {
      if (!api || !electionsInfo) return;

      try {
        const members = electionsInfo.members;

        const membersData = await Promise.all(
          members.map(async ([accountId, balance]) => {
            const address = accountId.toString();

            const accountInfo = await api.derive.accounts.info(address);
            const votes = allVotes[address]?.length || 0;

            const memberData: CouncilMember = {
              address,
              votes,
              balance: formatBalance(balance, {
                withUnit: "P3D",
                decimals: 12,
              }),
            };

            if (accountInfo.identity?.display) {
              memberData.identity = extractIdentity(accountInfo.identity);
            }

            return memberData;
          })
        );

        setCouncilMembers(membersData);
      } catch (error) {
        console.error("Error fetching council data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCouncilData();
  }, [api, electionsInfo, allVotes]);

  useEffect(() => {
    if (!api) return;
    (async () => {
      try {
        const primeOpt = (await api.query.council.prime()) as Option<AccountId>;
        if (primeOpt && primeOpt.isSome) {
          setPrime(primeOpt.unwrap().toString());
        } else {
          setPrime(null);
        }
      } catch {
        setPrime(null);
      }
    })();
  }, [api]);

  useEffect(() => {
    if (!api) return;

    (async () => {
      try {
        // Runners Up
        const runnersUpCodec = await api.query.phragmenElection.runnersUp();
        setRunnersUp(runnersUpCodec.toJSON() as RunnerUp[]);

        // Candidates
        const candidatesCodec = await api.query.phragmenElection.candidates();
        setCandidates(
          (candidatesCodec.toJSON() as CandidateTuple[]).map(([address, stake]) => ({
            address,
            stake,
          }))
        );
      } catch (e) {
        setRunnersUp([]);
        setCandidates([]);
      }
    })();
  }, [api]);

  useEffect(() => {
    async function fetchMyVotes() {
      if (!api || !lastSelectedAccount) {
        setMyVotes(null);
        return;
      }
      try {
        const voting = await api.query.phragmenElection.voting(lastSelectedAccount);
        const data = voting.toJSON() as unknown as MyVotingInfo;
        if (data && data.votes && data.votes.length > 0) {
          setMyVotes(data);
        } else {
          setMyVotes(null);
        }
      } catch {
        setMyVotes(null);
      }
    }
    fetchMyVotes();
  }, [api, lastSelectedAccount]);

  const handleToggleVoting = useCallback(() => {
    if (votingMode && selectedVotes.length > 0) {
      setShowVoteDialog(true);
    } else {
      setVotingMode((v) => !v);
      setSelectedVotes([]);
    }
  }, [votingMode, selectedVotes.length]);

  const handleSelectVote = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { value: address } = event.target;
    setSelectedVotes((prev) =>
      prev.includes(address)
        ? prev.filter((a) => a !== address)
        : [...prev, address]
    );
  }, []);

  const handleCloseVoteDialog = useCallback(() => {
    setShowVoteDialog(false);
    setVotingMode(false);
    setSelectedVotes([]);
  }, []);

  const handleShowCandidacyDialog = useCallback(() => setShowCandidacyDialog(true), []);
  const handleCloseCandidacyDialog = useCallback(() => setShowCandidacyDialog(false), []);
  const handleShowUnvoteAllDialog = useCallback(() => setShowUnvoteAllDialog(true), []);
  const handleCloseUnvoteAllDialog = useCallback(() => setShowUnvoteAllDialog(false), []);

  if (loading) {
    return <Spinner />;
  }

  const termProgressPercentage = termProgress
    ? ((termProgress.total - termProgress.current) / termProgress.total) * 100
    : 0;
  const remainingBlocks = termProgress
    ? termProgress.total - termProgress.mod
    : 0;
  const timeLeft = formatTimeLeft(remainingBlocks, t);
  const totalTime = termProgress ? formatTimeLeft(termProgress.total, t) : "";

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className={Classes.HEADING}>{t("governance.council_members")}</h2>
        <div className="flex items-center gap-4">
          {termProgress && (
            <div className="flex flex-col text-right">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t("governance.term_progress")} (
                {termProgressPercentage.toFixed(1)}%)
              </span>
              <div className="flex items-center justify-end gap-2">
                <CircularProgress
                  value={termProgressPercentage / 100}
                  size={20}
                  strokeWidth={3}
                  intent={Intent.PRIMARY}
                />
                <span className="text-sm font-medium">
                  {timeLeft} {t("governance.remaining")}{" "}
                  <span className="text-gray-500">/ {totalTime}</span>
                </span>
              </div>
            </div>
          )}
          <Button
            icon="tick-circle"
            intent={votingMode ? "success" : "none"}
            text={
              votingMode && selectedVotes.length > 0
                ? `${t("governance.vote_btn", "Vote")} (${selectedVotes.length})`
                : t("governance.vote_btn", "Vote")
            }
            onClick={handleToggleVoting}
            style={{ minWidth: 90 }}
          />
          {myVotes && myVotes.votes.length > 0 && (
            <Button
              icon="eraser"
              intent="danger"
              text={t("governance.unvote_all_btn", "Unvote All")}
              onClick={handleShowUnvoteAllDialog}
              style={{ minWidth: 110 }}
            />
          )}
          <Button
            icon="plus"
            intent="primary"
            text={t("governance.submit_candidacy_btn", "Candidacy")}
            onClick={handleShowCandidacyDialog}
          />
        </div>
      </div>
      <DialogSubmitCandidacy isOpen={showCandidacyDialog} onClose={handleCloseCandidacyDialog} />
      <DialogVote
        isOpen={showVoteDialog}
        onClose={handleCloseVoteDialog}
        selectedVotes={selectedVotes}
        selectedAccount={lastSelectedAccount || ""}
      />
      <DialogUnvoteAll
        isOpen={showUnvoteAllDialog}
        onClose={handleCloseUnvoteAllDialog}
        selectedAccount={lastSelectedAccount || ""}
      />
      <HTMLTable className="w-full" striped={true}>
        <thead>
          <tr>
            {votingMode && <th></th>}
            <th className="text-right w-24 text-gray-500">{t("governance.votes")}</th>
            <th className="text-right w-32 text-gray-500">{t("governance.balance")}</th>
            <th className="w-full text-gray-500">{t("governance.member")}</th>
          </tr>
        </thead>
        <tbody>
          {councilMembers.map((member) => (
            <tr key={member.address}>
              {votingMode && (
                <td>
                  <input
                    type="checkbox"
                    value={member.address}
                    checked={selectedVotes.includes(member.address)}
                    onChange={handleSelectVote}
                  />
                </td>
              )}
              <td className="text-right">
                <Tag intent={Intent.SUCCESS} minimal>
                  {member.votes}
                </Tag>
              </td>
              <td className="text-right">
                <Tag intent={Intent.PRIMARY} minimal>
                  {member.balance}
                </Tag>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <AccountName
                    address={member.address}
                    identity={member.identity}
                  />
                  {prime === member.address && (
                    <Tag intent={Intent.WARNING} minimal>
                      {t('governance.prime')}
                    </Tag>
                  )}
                  {myVotes && myVotes.votes.includes(member.address) && (
                    <>
                      <Tag intent={Intent.DANGER} minimal>
                        {t('governance.my_vote')}
                      </Tag>
                      <Tag intent={Intent.NONE} minimal>
                        {formatBalance(myVotes.stake, { withUnit: 'P3D', decimals: 12 })}
                      </Tag>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </HTMLTable>
      {/* Runners Up Table */}
      {runnersUp.length > 0 && (
        <div className="mt-8">
          <h3 className={Classes.HEADING}>{t('governance.runners_up')}</h3>
          <HTMLTable className="w-full" striped={true}>
            <thead>
              <tr>
                {votingMode && <th></th>}
                <th className="w-full text-gray-500">{t('governance.member')}</th>
                <th className="text-right w-32 text-gray-500">{t('governance.balance')}</th>
                <th className="text-right w-32 text-gray-500">{t('governance.deposit')}</th>
              </tr>
            </thead>
            <tbody>
              {runnersUp.map((runner) => (
                <tr key={runner.who}>
                  {votingMode && (
                    <td>
                      <input
                        type="checkbox"
                        value={runner.who}
                        checked={selectedVotes.includes(runner.who)}
                        onChange={handleSelectVote}
                      />
                    </td>
                  )}
                  <td>
                    <div className="flex items-center gap-2">
                      <AccountName address={runner.who} />
                      {myVotes && myVotes.votes.includes(runner.who) && (
                        <>
                          <Tag intent={Intent.DANGER} minimal>
                            {t('governance.my_vote')}
                          </Tag>
                          <Tag intent={Intent.NONE} minimal>
                            {formatBalance(myVotes.stake, { withUnit: 'P3D', decimals: 12 })}
                          </Tag>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="text-right">
                    <Tag intent={Intent.PRIMARY} minimal>{formatBalance(runner.stake, { withUnit: 'P3D', decimals: 12 })}</Tag>
                  </td>
                  <td className="text-right">
                    <Tag intent={Intent.NONE} minimal>{formatBalance(runner.deposit, { withUnit: 'P3D', decimals: 12 })}</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        </div>
      )}
      {/* Candidates Table */}
      {candidates.length > 0 && (
        <div className="mt-8">
          <h3 className={Classes.HEADING}>{t('governance.candidates')}</h3>
          <HTMLTable className="w-full" striped={true}>
            <thead>
              <tr>
                {votingMode && <th></th>}
                <th className="w-full text-gray-500">{t('governance.member')}</th>
                <th className="text-right w-32 text-gray-500">{t('governance.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((cand) => (
                <tr key={cand.address}>
                  {votingMode && (
                    <td>
                      <input
                        type="checkbox"
                        value={cand.address}
                        checked={selectedVotes.includes(cand.address)}
                        onChange={handleSelectVote}
                      />
                    </td>
                  )}
                  <td>
                    <div className="flex items-center gap-2">
                      <AccountName address={cand.address} />
                      {myVotes && myVotes.votes.includes(cand.address) && (
                        <>
                          <Tag intent={Intent.DANGER} minimal>
                            {t('governance.my_vote')}
                          </Tag>
                          <Tag intent={Intent.NONE} minimal>
                            {formatBalance(myVotes.stake, { withUnit: 'P3D', decimals: 12 })}
                          </Tag>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="text-right">
                    <Tag intent={Intent.PRIMARY} minimal>{formatBalance(cand.stake, { withUnit: 'P3D', decimals: 12 })}</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        </div>
      )}
    </div>
  );
}
