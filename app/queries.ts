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

export interface TransfersData {
  getTransfers: {
    objects: ITransfer[];
  };
}

export interface TransfersVars {
  accountId: string;
}

export const GET_TRANSFERS = gql`
  query GetTransfers($accountId: String!) {
    getTransfers(pageSize: 100, pageKey: "1", filters: { or: [{ fromMultiAddressAccountId: $accountId }, { toMultiAddressAccountId: $accountId }] }) {
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

export type ILogData = {
  logIdx: number;
  typeId: number;
  typeName: string;
  data: string;
};

export type LogsData = {
  getLogs: {
    objects: ILogData[];
  };
};

export type LogsVars = {
  blockId: number;
};

export const GET_LOGS = gql`
  query GetLogs($blockId: ID!) {
    getLogs(pageSize: 100, pageKey: "1", filters: { blockNumber: $blockId }) {
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

export type IBlockData = {
  hash: string;
  datetime: string;
  countExtrinsics: number;
  countEvents: number;
  countLogs: number;
  specName: string;
  specVersion: number;
};

export type BlockData = {
  getBlock: IBlockData;
};

export type BlockVars = {
  blockId: number;
};

export const GET_BLOCK = gql`
  query GetBlock($blockId: ID!) {
    getBlock(filters: { number: $blockId }) {
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
