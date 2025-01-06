import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, Elevation, Spinner, Tag, Intent, HTMLTable, Classes, Button } from "@blueprintjs/core";
import { useApi, useAccounts } from "app/components/Api";
import { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import { AccountName } from "app/components/common/AccountName";
import useToaster from "app/hooks/useToaster";
import { signAndSend } from "app/utils/sign";
import { AccountSelector } from "app/components/governance/AccountSelector";

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

  useEffect(() => {
    async function fetchMotions() {
      if (!api) return;

      try {
        const proposals = await api.derive.council.proposals();
        setMotions(proposals);
      } catch (error) {
        console.error("Error fetching motions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMotions();
  }, [api]);

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
    const ayeVotes = motion.votes.ayes?.map((a) => a.toString()) || [];
    const nayVotes = motion.votes.nays?.map((a) => a.toString()) || [];
    return ayeVotes.includes(address) || nayVotes.includes(address);
  };

  const handleVote = async (motion: DeriveCollectiveProposal, approve: boolean) => {
    if (!api || !motion.votes || !selectedAddress) return;

    const account = accounts.find((a) => a.address === selectedAddress);
    if (!account) return;

    const isLocked = account.isLocked && !account.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_account_locked"),
      });
      return;
    }

    setVotingLoading((prev) => ({ ...prev, [`${motion.hash.toString()}-${approve}`]: true }));

    try {
      const tx = api.tx.council.vote(motion.hash, motion.votes.index, approve);
      await signAndSend(tx, account);

      // Refresh motions after voting
      const proposals = await api.derive.council.proposals();
      setMotions(proposals);

      toaster.show({
        icon: "tick",
        intent: Intent.SUCCESS,
        message: t("messages.lbl_tx_sent"),
      });
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
    } finally {
      setVotingLoading((prev) => ({ ...prev, [`${motion.hash.toString()}-${approve}`]: false }));
    }
  };

  if (loading) {
    return <Spinner />;
  }

  const selectedAccount = selectedAddress ? accounts.find((a) => a.address === selectedAddress) : null;
  const isSelectedCouncilMember = selectedAddress ? isCouncilMember(selectedAddress) : false;

  return (
    <>
      <AccountSelector onAccountChange={setSelectedAddress} selectedAddress={selectedAddress} />
      <Card elevation={Elevation.ONE} className="p-4">
        <h2 className={`${Classes.HEADING} mb-4`}>{t("governance.motions")}</h2>
        <HTMLTable className="w-full">
          <thead>
            <tr>
              <th className="w-16">#</th>
              <th>{t("governance.motion")}</th>
              <th>{t("governance.votes")}</th>
              <th className="w-24 text-right">{t("governance.threshold")}</th>
              {isSelectedCouncilMember && <th className="w-32 text-right">{t("governance.vote")}</th>}
            </tr>
          </thead>
          <tbody>
            {motions.map(
              (motion) =>
                motion.proposal &&
                motion.votes && (
                  <tr key={motion.hash.toString()}>
                    <td>
                      <Tag minimal round>
                        {motion.votes.index.toString()}
                      </Tag>
                    </td>
                    <td>
                      <div className={`${Classes.TEXT_LARGE} font-medium`}>
                        {motion.proposal.section}.{motion.proposal.method}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Tag intent={Intent.SUCCESS} minimal>
                            {motion.votes.ayes?.length || 0}
                          </Tag>
                          <div className="flex flex-wrap gap-1">
                            {motion.votes?.ayes?.map((address) => (
                              <Tag key={address.toString()} minimal className={Classes.TEXT_SMALL}>
                                <AccountName address={address.toString()} />
                              </Tag>
                            ))}
                          </div>
                        </div>
                        {motion.votes?.nays?.length ? (
                          <div className="flex items-center gap-2">
                            <Tag intent={Intent.DANGER} minimal>
                              {motion.votes.nays.length}
                            </Tag>
                            <div className="flex flex-wrap gap-1">
                              {motion.votes?.nays?.map((address) => (
                                <Tag key={address.toString()} minimal className={Classes.TEXT_SMALL}>
                                  <AccountName address={address.toString()} />
                                </Tag>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-right">
                      <Tag intent={Intent.PRIMARY} minimal>
                        {motion.votes.ayes?.length || 0}/{motion.votes.threshold?.toNumber() || 0}
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
                                loading={votingLoading[`${motion.hash.toString()}-true`]}
                                onClick={() => handleVote(motion, true)}
                                className="min-w-[80px]"
                              >
                                {t("governance.ayes")}
                              </Button>
                              <Button
                                intent={Intent.DANGER}
                                icon="small-cross"
                                loading={votingLoading[`${motion.hash.toString()}-false`]}
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
                )
            )}
          </tbody>
        </HTMLTable>
      </Card>
    </>
  );
}
