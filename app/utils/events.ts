import { ApiPromise } from "@polkadot/api";
import { encodeAddress } from "@polkadot/util-crypto/address/encode";

import { IPalletIdentityRegistrarInfo } from "../components/common/UserCard";
import { QueryResult } from "@apollo/client";
import type { EventsData, EventsVars } from "../queries";


export async function getIdentityJudgementRequests(
    api: ApiPromise,
    ss58format: number | false,
    registrarIndex: number | undefined,
    queryEvents: QueryResult<EventsData, EventsVars>,
): Promise<IPalletIdentityRegistrarInfo[]> {
    const candidateInfoArray: IPalletIdentityRegistrarInfo[] = [];
    console.log('hit2!');
    if (queryEvents.data !== undefined && registrarIndex !== undefined && api) {
        let candidateAddress: string;
        let candidateInfo: IPalletIdentityRegistrarInfo;
        for (let i = 0; i++; i < queryEvents.data.getEvents.objects.length) {
            let item = queryEvents.data.getEvents.objects[i];
            console.log(item.attributes);

            candidateAddress = encodeAddress('0x6e50b0fed9840b7331d09ec0276097ada08d4215f56caa959ca925ef58dbd954', ss58format as number);
            candidateInfo = (await api.query.identity.identityOf(candidateAddress)).toHuman() as IPalletIdentityRegistrarInfo;
            if (candidateInfo) {
                candidateInfoArray.push(candidateInfo);
            }
        }
    }
    return candidateInfoArray;
}
