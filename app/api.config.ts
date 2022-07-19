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
  Timestamp: "u64",
};
