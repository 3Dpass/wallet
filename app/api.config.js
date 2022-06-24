export const rpc = {
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
export const types = {
  AccountInfo: "AccountInfoWithTripleRefCount",
  Address: "AccountId",
  LookupSource: "AccountId",
  Weight: "u32",
};
