import { gql } from "@apollo/client";

export function getTransfers(accountId) {
  return gql`
    query {
      getTransfers(
        pageSize: 100
        pageKey: "1"
        filters: {
          or: [
            { fromMultiAddressAccountId: "${accountId}" }
            { toMultiAddressAccountId: "${accountId}" }
          ]
        }
      ) {
        pageInfo {
          pageSize
          pageNext
        }
        objects {
          blockNumber
          fromMultiAddressAccountId
          toMultiAddressAccountId
          value
          blockDatetime
          complete
        }
      }
    }
  `;
}
