import { useApi } from "../components/Api";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Elevation, Spinner, Tag, Intent, HTMLTable, Classes } from "@blueprintjs/core";
import type { AccountId } from "@polkadot/types/interfaces";
import type { DeriveElectionsInfo, DeriveCouncilVotes } from "@polkadot/api-derive/types";
import { formatBalance } from "@polkadot/util";
import { AccountName, extractIdentity } from "app/components/common/AccountName";

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

const transformVotes = (entries: DeriveCouncilVotes): Record<string, AccountId[]> =>
  entries.reduce<Record<string, AccountId[]>>((result, [voter, { votes }]) => {
    votes.forEach((candidate): void => {
      const address = candidate.toString();

      if (!result[address]) {
        result[address] = [];
      }

      result[address].push(voter);
    });

    return result;
  }, {});

export default function GovernanceMembers() {
  const { t } = useTranslation();
  const api = useApi();
  const [councilMembers, setCouncilMembers] = useState<CouncilMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [electionsInfo, setElectionsInfo] = useState<DeriveElectionsInfo | null>(null);
  const [allVotes, setAllVotes] = useState<Record<string, AccountId[]>>({});

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

  return (
    <div>
      <h2 className={`${Classes.HEADING} mb-4`}>{t("governance.council_members")}</h2>
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
                <AccountName address={member.address} identity={member.identity} />
              </td>
            </tr>
          ))}
        </tbody>
      </HTMLTable>
    </div>
  );
}
