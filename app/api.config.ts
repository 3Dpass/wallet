export const ss58formats = {
  test: 72,
  live: 71,
};
export const ss58format = ss58formats.test;
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
