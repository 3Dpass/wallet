import { Button, Intent } from "@blueprintjs/core";
import useApi from "../../hooks/useApi";
import UserCard from "./UserCard";
import { getIdentityJudgementRequests } from "app/utils/events";
import { useSS58Format } from "../../hooks/useSS58Format";
import useToaster from "../../hooks/useToaster";
import { useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";
import { signAndSend } from "../../utils/sign";
import { IPalletIdentityRegistrarInfo } from "../../components/common/UserCard";
import { useQuery } from "@apollo/client";
import { GET_EVENTS } from "../../queries";
import type { EventsData, EventsVars } from "../../queries";
import { Spinner } from "@blueprintjs/core";
import Error from "../../components/common/Error";

type IProps = {
  regIndex: number;
  pair: KeyringPair;
  dateMonthAgo: Date;
};

type IData = {
  candidateList: IPalletIdentityRegistrarInfo[] | null;
};

export default function CandidateCards({ regIndex, pair, dateMonthAgo }: IProps) {
  const ss58format = useSS58Format();
  const api = useApi();
  const toaster = useToaster();
  const [addressLoading, setAddressLoading] = useState("");
  const dataInitial: IData = {
    candidateList: null,
  };
  const [dataState, setData] = useState(dataInitial);
  const queryEvents = useQuery<EventsData, EventsVars>(GET_EVENTS, {
    variables: { eventModule: "Identity", eventName: "JudgementRequested", blockDatetimeGte: dateMonthAgo.toISOString(), pageSize: 10000 },
  });
  if (queryEvents.data && !dataState.candidateList && api) {
    getIdentityJudgementRequests(api, ss58format, regIndex, queryEvents).then((newCandidateList) => {
      setData((prev) => ({ ...prev, candidateList: newCandidateList }));
    });
  }

  async function handleSubmitAddJudgement(candidateAddress: string) {
    if (!api) {
      return;
    }
    setAddressLoading(candidateAddress);
    try {
      const tx = api.tx.identity.provideJudgement(regIndex, candidateAddress, null);
      await signAndSend(tx, pair, {});
      toaster.show({
        icon: "endorsed",
        intent: Intent.SUCCESS,
        message: "You requested for judgement",
      });
    } catch (e: any) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: e.message,
      });
    } finally {
      setAddressLoading("");
    }
  }

  if (queryEvents.loading || !dataState.candidateList) return <Spinner />;
  if (queryEvents.error) return <Error>Error loading block data, try to reload.</Error>;

  return (
    <div>
      {dataState.candidateList &&
        dataState.candidateList.map((candidateInfo) => {
          return (
            <div key={candidateInfo.account} className="relative">
              <UserCard registrarInfo={candidateInfo} />
              <Button
                intent={Intent.PRIMARY}
                disabled={false}
                onClick={() => {
                  handleSubmitAddJudgement(candidateInfo.account);
                }}
                loading={addressLoading == candidateInfo.account}
                text="Add judgement"
                className="absolute top-2 right-2"
              />
            </div>
          );
        })}
    </div>
  );
}
