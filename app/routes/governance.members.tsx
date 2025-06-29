import { Classes, HTMLTable, Intent, Spinner, Tag } from "@blueprintjs/core";
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
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../components/Api";

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

const transformVotes = (
  entries: DeriveCouncilVotes
): Record<string, AccountId[]> =>
  entries.reduce<Record<string, AccountId[]>>((result, [voter, { votes }]) => {
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
        {termProgress && (
          <div className="flex items-center gap-4">
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
          </div>
        )}
      </div>
      <HTMLTable className="w-full" striped={true}>
        <thead>
          <tr>
            <th className="text-right w-24">{t("governance.votes")}</th>
            <th className="text-right w-32">{t("governance.balance")}</th>
            <th className="w-full">{t("governance.member")}</th>
          </tr>
        </thead>
        <tbody>
          {councilMembers.map((member) => (
            <tr key={member.address}>
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
                <AccountName
                  address={member.address}
                  identity={member.identity}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </HTMLTable>
    </div>
  );
}
