import { Button, Intent, Spinner } from "@blueprintjs/core";
import { useApi } from "../Api";
import type { IPalletIdentityRegistrarInfo } from "./UserCard";
import UserCard from "./UserCard";
import { getIdentityJudgementRequests } from "app/utils/events";
import useToaster from "../../hooks/useToaster";
import { useState } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";
import { signAndSend } from "../../utils/sign";
import { useQuery } from "@apollo/client";
import type { EventsData, EventsVars } from "../../queries";
import { GET_EVENTS } from "../../queries";
import Error from "../../components/common/Error";
import type { IFormatOptions } from "../../atoms";
import { formatOptionsAtom } from "../../atoms";
import { useAtomValue } from "jotai";

type IProps = {
  regIndex: number;
  pair: KeyringPair;
  dateMonthAgo: Date;
};

type IData = {
  candidateList: IPalletIdentityRegistrarInfo[] | null;
};

export default function CandidateCards({ regIndex, pair, dateMonthAgo }: IProps) {
  const api = useApi();
  const toaster = useToaster();
  const [addressLoading, setAddressLoading] = useState("");
  const formatOptions: false | IFormatOptions = useAtomValue(formatOptionsAtom);
  const dataInitial: IData = {
    candidateList: null,
  };
  const [dataState, setData] = useState(dataInitial);
  const queryEvents = useQuery<EventsData, EventsVars>(GET_EVENTS, {
    variables: { eventModule: "Identity", eventName: "JudgementRequested", blockDatetimeGte: dateMonthAgo.toISOString(), pageSize: 10000 },
  });
  if (queryEvents.data && !dataState.candidateList && api && formatOptions) {
    getIdentityJudgementRequests(api, formatOptions.chainSS58, regIndex, queryEvents).then((newCandidateList) => {
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
        message: "Your judgement was sent",
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
                  void handleSubmitAddJudgement(candidateInfo.account);
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
