import { gql } from "@apollo/client";

export interface ITransfer {
  blockNumber: number;
  extrinsicIdx: number;
  fromMultiAddressAccountId: string;
  toMultiAddressAccountId: string;
  value: number;
  blockDatetime: string;
  complete: boolean;
}

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
          extrinsicIdx
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

export type ILogData = {
  logIdx: number;
  typeId: number;
  typeName: string;
  data: string;
};

export function getLogs(blockId) {
  return gql`
    query {
      getLogs(
        pageSize: 100
        pageKey: "1"
        filters: {
          blockNumber: ${blockId}
        }
      ) {
        pageInfo {
          pageSize
          pageNext
        }
        objects {
          logIdx
          typeId
          typeName
          data
        }
      }
    }
  `;
}

export type IBlockData = {
  hash: string;
  datetime: string;
  countExtrinsics: number;
  countEvents: number;
  countLogs: number;
  specName: string;
  specVersion: number;
};

export function getBlock(blockId) {
  return gql`
    query {
      getBlock(filters: { number: ${blockId} }) {
        hash
        datetime
        countExtrinsics
        countEvents
        countLogs
        specName
        specVersion
      }
    }
  `;
}
