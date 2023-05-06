import { useQuery } from "@apollo/client";

import type { EventsData, EventsVars } from "../queries";
import { GET_EVENTS } from "../queries";


export const getIdentityJudgementRequests = (registrarIndex: number | undefined): string[] => {
    const queryEvents = useQuery<EventsData, EventsVars>(GET_EVENTS, {
        variables: { eventModule: 'Identity', eventName: 'JudgementRequested', blockDatetimeGte: '', pageSize: 10000 },
    });
    if (queryEvents.data !== undefined && registrarIndex !== undefined) {
        queryEvents.data.getEvents.objects.forEach((item) => {
            item.attributes
        });
    }
    return [];
}
