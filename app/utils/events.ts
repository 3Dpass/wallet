import type { ApiPromise } from "@polkadot/api";
import { encodeAddress } from "@polkadot/util-crypto/address/encode";

import type { IPalletIdentityRegistrarInfo } from "../components/common/UserCard";
import type { QueryResult } from "@apollo/client";
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
  if (queryEvents.data == undefined || registrarIndex == undefined || !api) {
    return [];
  }
  const candidateInfoArray: IPalletIdentityRegistrarInfo[] = [];
  let candidateAddress: string;
  let candidateInfo: IPalletIdentityRegistrarInfo;
  let addressAndRegIndex;
  for (const item of queryEvents.data.getEvents.objects) {
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
  return candidateInfoArray;
}
