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

export type IEventPageData = {
  pageSize: number;
  pageNext: string;
  pagePrev: string;
};

export type IEventObjectData = {
  blockNumber: number;
  eventIdxL: number;
  extrinsicIdx: number;
  event: string;
  eventModule: string;
  eventName: string;
  phaseIdx: number;
  phaseName: string;
  attributes: string;
  topics: string;
  blockDatetime: string;
  blockHash: string;
  specName: string;
  specVersion: number;
  complete: number;
};

export type IEventData = {
  pageInfo: IEventPageData;
  objects: IEventObjectData[];
};

export type EventsData = {
  getEvents: IEventData;
};

export type EventsVars = {
  eventModule: string;
  eventName: string;
  blockDatetimeGte: string;
  pageSize: number;
};

export const GET_EVENTS = gql`
  query GetEvents($eventModule: String!, $eventName: String!, $blockDatetimeGte: String!, $pageSize: number = 2147483647) {
    getEvents (filters: {
      eventModule: $eventModule,
      eventName: $eventName,
      blockDatetimeGte: $blockDatetimeGte
    }, pageSize: $pageSize) {
      pageInfo {
        pageSize
        pageNext
        pagePrev
      }
     objects {
      blockNumber
      eventIdx
      extrinsicIdx
      event
      eventModule
      eventName
      phaseIdx
      phaseName
      attributes
      topics
      blockDatetime
      blockHash
      specName
      specVersion
      complete
    }
    }
  }  
`;
