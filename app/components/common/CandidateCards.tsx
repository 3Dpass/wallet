import { Button, Intent } from "@blueprintjs/core";
import useApi from "../../hooks/useApi";
import UserCard from "./UserCard";
import { getIdentityJudgementRequests } from "app/utils/events";
import { useSS58Format } from "../../hooks/useSS58Format";
import useToaster from "../../hooks/useToaster";
import { useState, useEffect } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";
import { signAndSend } from "../../utils/sign";
import { IPalletIdentityRegistrarInfo } from "../../components/common/UserCard";
import { useQuery } from "@apollo/client";
import { GET_EVENTS } from "../../queries";
import type { EventsData, EventsVars } from "../../queries";
import { Card, Spinner } from "@blueprintjs/core";


type IProps = {
    regIndex: number;
    pair: KeyringPair;
    onClose: () => void;
}

type IData = {
    candidateList: IPalletIdentityRegistrarInfo[];
}

export default function CandidateCards({ regIndex, pair, onClose }: IProps) {
    const ss58format = useSS58Format();
    const api = useApi();
    const toaster = useToaster();
    const [isLoading, setIsLoading] = useState(false);
    const dataInitial: IData = {
        candidateList: [],
      };
    const [dataState, setData] = useState(dataInitial);
    const dateMonthAgo = new Date();
    dateMonthAgo.setMonth(dateMonthAgo.getMonth() - 1);
    const queryEvents = useQuery<EventsData, EventsVars>(GET_EVENTS, {
        variables: { eventModule: 'Identity', eventName: 'JudgementRequested', blockDatetimeGte: dateMonthAgo.toISOString(), pageSize: 10000 },
    });

    useEffect(() => {
        if (!api) { return; }
        setIsLoading(false);
        console.log('queryEvents: ', queryEvents);
        getIdentityJudgementRequests(api, ss58format, regIndex, queryEvents).then((newCandidateList) => {
            setData((prev) => ({ ...prev, candidateList: newCandidateList}));
        });
    }, [api, pair]);
    
    async function handleSubmitAddJudgement(candidateAddress: string) {
        if (!api) {
          return;
        }
        if (pair.isLocked && !pair.meta.isInjected) {
          toaster.show({
            icon: "error",
            intent: Intent.DANGER,
            message: "Account is locked",
          });
          return;
        }
        setIsLoading(true);
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
          setIsLoading(false);
          onClose();
        }
      }
    
      if (queryEvents.loading) return <Spinner />;

      dataState.candidateList.map((candidateInfo) => {
        return <>
            <UserCard registrarInfo={candidateInfo} />
            <Button
                intent={Intent.PRIMARY}
                disabled={false}
                onClick={() => { handleSubmitAddJudgement(candidateInfo.account) }}
                loading={isLoading}
                text="Add judgement"
            />
          </>;
      })
}
