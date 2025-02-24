export const NETWORK_TEST = "test";
export const NETWORK_MAINNET = "mainnet";
export const ss58formats = {
  [NETWORK_TEST]: 72,
  [NETWORK_MAINNET]: 71,
};
export const genesisHashes = {
  [NETWORK_TEST]:
    "0x07ac0e270ed6a2686770900de69995d7f2c53a89122b58f02045d93e9ec32c8e",
  [NETWORK_MAINNET]:
    "0x6c5894837ad89b6d92b114a2fb3eafa8fe3d26a54848e3447015442cd6ef4e66",
};

export const MAX_BLOCKS = 6;
export const RPC_CONFIG = {
  poscan: {
    pushMiningObject: {
      description: "Submit 3D object for mining.",
      params: [
        {
          name: "obj_id",
          type: "u64",
        },
        {
          name: "obj",
          type: "String",
        },
      ],
      type: "u64",
    },
    getMiningObject: {
      description: "Get and unpack 3D object from block.",
      params: [
        {
          name: "at",
          type: "BlockHash",
        },
      ],
      type: "String",
    },
  },
};
export const RPC_TYPES = {
  AccountInfo: "AccountInfoWithTripleRefCount",
  Address: "AccountId",
  LookupSource: "AccountId",
  Keys: "SessionKeys2",
  Weight: "u32",
  Difficulty: "u256",
  DifficultyAndTimestamp: {
    difficulty: "Difficulty",
    timestamp: "u64",
  },
  LockParameters: {
    period: "u16",
    divide: "u16",
  },
  StorageVersion: {
    _enum: ["V0", "V1"],
    V0: "u8",
    V1: "u8",
  },
};
