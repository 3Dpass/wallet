import { ApiPromise } from "@polkadot/api";
import { encodeAddress } from "@polkadot/util-crypto/address/encode";

import { IPalletIdentityRegistrarInfo } from "../components/common/UserCard";
import { QueryResult } from "@apollo/client";
import type { EventsData, EventsVars } from "../queries";

type IJudgementInfo = {
  FeePaid: number;
};

export async function getIdentityJudgementRequests(
  api: ApiPromise,
  ss58format: number | false,
  registrarIndex: number | undefined,
  queryEvents: QueryResult<EventsData, EventsVars>
): Promise<IPalletIdentityRegistrarInfo[]> {
  const candidateInfoArray: IPalletIdentityRegistrarInfo[] = [];
  if (queryEvents.data !== undefined && registrarIndex !== undefined && api) {
    let candidateAddress: string;
    let candidateInfo: IPalletIdentityRegistrarInfo;
    let addressAndRegIndex;
    for (let i = 0; i < queryEvents.data.getEvents.objects.length; i++) {
      let item = queryEvents.data.getEvents.objects[i];
      addressAndRegIndex = JSON.parse(item.attributes);
      if (addressAndRegIndex.length > 1 && addressAndRegIndex[1] == registrarIndex) {
        candidateAddress = encodeAddress(addressAndRegIndex[0], ss58format as number);
        candidateInfo = (await api.query.identity.identityOf(candidateAddress)).toHuman() as IPalletIdentityRegistrarInfo;
        if (
          candidateInfo &&
          candidateInfo.judgements[0] &&
          candidateInfo.judgements[0].length > 1 &&
          (candidateInfo.judgements[0][1] as IJudgementInfo)["FeePaid"]
        ) {
          candidateInfo.account = candidateAddress;
          candidateInfoArray.push(candidateInfo);
        }
      }
    }
  }
  return candidateInfoArray;
}
