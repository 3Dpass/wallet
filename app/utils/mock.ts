import type { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import { Hash } from "@polkadot/types/interfaces";

// Mock storage for votes
export const mockVotes = new Map<string, { ayes: string[]; nays: string[] }>();

// Mock storage for bounties
export const mockBounties = new Map<
  string,
  {
    description: string;
    proposer: string;
    value: bigint;
    fee?: bigint;
    curator?: string;
    status: string;
  }
>();

// Initialize mock bounties with different statuses
export const initializeMockBounties = () => {
  mockBounties.clear();

  // Proposed bounty
  mockBounties.set("47", {
    description: "Mock Proposed Bounty",
    proposer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    value: BigInt(1000000000000),
    status: "Proposed",
  });

  // Approved bounty
  mockBounties.set("46", {
    description: "Mock Approved Bounty",
    proposer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    value: BigInt(2000000000000),
    status: "Approved",
  });

  // Funded bounty
  mockBounties.set("45", {
    description: "Mock Funded Bounty",
    proposer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    value: BigInt(3000000000000),
    status: "Funded",
  });

  // CuratorProposed bounty
  mockBounties.set("44", {
    description: "Mock Curator Proposed Bounty",
    proposer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    value: BigInt(4000000000000),
    fee: BigInt(400000000000),
    curator: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    status: "CuratorProposed",
  });

  // Active bounty
  mockBounties.set("43", {
    description: "Mock Active Bounty",
    proposer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    value: BigInt(5000000000000),
    fee: BigInt(500000000000),
    curator: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    status: "Active",
  });

  // PendingPayout bounty
  mockBounties.set("42", {
    description: "Mock Pending Payout Bounty",
    proposer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    value: BigInt(6000000000000),
    fee: BigInt(600000000000),
    curator: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    status: "PendingPayout",
  });
};

// Helper to create a mock address object that matches Polkadot API's format
const createMockAddress = (address: string) => ({
  toString: () => address,
  toHuman: () => address,
  toJSON: () => address,
  [Symbol.toStringTag]: "Address",
});

// Mock API for testing
export const createMockApi = () => {
  return {
    tx: {
      council: {
        vote: (hash: string | Hash, index: number, approve: boolean) => ({
          method: {
            section: "council",
            method: "vote",
            toString: () => "council.vote",
          },
          args: [hash, index, approve],
        }),
      },
    },
    query: {
      bounties: {
        bounties: (id: string) => {
          console.log("Mock API - bounties query called with id:", id);
          const bounty = mockBounties.get(id.toString());
          console.log("Mock API - found bounty:", bounty);
          return {
            isSome: !!bounty,
            unwrap: () => ({
              proposer: createMockAddress(bounty?.proposer || ""),
              value: { toBigInt: () => bounty?.value || BigInt(0) },
              fee: bounty?.fee ? { toBigInt: () => bounty.fee } : undefined,
              curator: bounty?.curator ? createMockAddress(bounty.curator) : undefined,
              status:
                bounty?.status === "Active"
                  ? {
                      type: bounty.status,
                      asActive: {
                        curator: createMockAddress(bounty.curator || ""),
                        updateDue: { toBigInt: () => BigInt(1000) },
                      },
                    }
                  : bounty?.status === "PendingPayout"
                    ? {
                        type: bounty.status,
                        asPendingPayout: {
                          curator: createMockAddress(bounty.curator || ""),
                          unlockAt: { toBigInt: () => BigInt(2000) },
                        },
                      }
                    : bounty?.status === "CuratorProposed"
                      ? {
                          type: bounty.status,
                          asCuratorProposed: {
                            curator: createMockAddress(bounty.curator || ""),
                          },
                        }
                      : {
                          type: bounty?.status || "Unknown",
                        },
            }),
            unwrapOr: (defaultValue: any) => {
              if (!bounty) return defaultValue;
              return {
                proposer: createMockAddress(bounty.proposer),
                value: { toBigInt: () => bounty.value },
                fee: bounty.fee ? { toBigInt: () => bounty.fee } : undefined,
                curator: bounty.curator ? createMockAddress(bounty.curator) : undefined,
                status:
                  bounty.status === "Active"
                    ? {
                        type: bounty.status,
                        asActive: {
                          curator: createMockAddress(bounty.curator || ""),
                          updateDue: { toBigInt: () => BigInt(1000) },
                        },
                      }
                    : bounty.status === "PendingPayout"
                      ? {
                          type: bounty.status,
                          asPendingPayout: {
                            curator: createMockAddress(bounty.curator || ""),
                            unlockAt: { toBigInt: () => BigInt(2000) },
                          },
                        }
                      : bounty.status === "CuratorProposed"
                        ? {
                            type: bounty.status,
                            asCuratorProposed: {
                              curator: createMockAddress(bounty.curator || ""),
                            },
                          }
                        : {
                            type: bounty.status,
                          },
              };
            },
          };
        },
        bountyDescriptions: (id: string) => {
          console.log("Mock API - bountyDescriptions called with id:", id);
          const bounty = mockBounties.get(id.toString());
          console.log("Mock API - found bounty for description:", bounty);
          return {
            isSome: !!bounty,
            unwrap: () => ({
              toHex: () => {
                if (!bounty) return "0x";
                const hex = Buffer.from(bounty.description).toString("hex");
                return `0x${hex}`;
              },
            }),
          };
        },
        entries: async () => {
          console.log("Mock API - bounties.entries called");
          const entries = Array.from(mockBounties.entries()).map(([id, bounty]) => [
            { args: [{ toString: () => id }] },
            {
              isSome: true,
              unwrap: () => ({
                proposer: { toString: () => bounty.proposer },
                value: { toBigInt: () => bounty.value },
                fee: bounty.fee ? { toBigInt: () => bounty.fee } : undefined,
                curator: bounty.curator ? { toString: () => bounty.curator } : undefined,
                status: { type: bounty.status },
              }),
            },
          ]);
          console.log("Mock API - bounties.entries returning:", entries);
          return entries;
        },
      },
    },
    derive: {
      council: {
        proposals: async () => {
          // Return mock proposals with current votes
          return Array.from(mockVotes.entries()).map(([hash, votes]) => ({
            hash: { toString: () => hash } as Hash,
            votes: {
              index: { toString: () => "0" },
              threshold: { toNumber: () => 3 },
              // Convert string addresses to mock address objects
              ayes: votes.ayes.map(createMockAddress),
              nays: votes.nays.map(createMockAddress),
              toString: () => `ayes: ${votes.ayes.length}, nays: ${votes.nays.length}`,
              [Symbol.toStringTag]: "Votes",
            },
            proposal: {
              section: "mock",
              method: "proposal",
              toString: () => "mock.proposal",
              [Symbol.toStringTag]: "Proposal",
            },
            [Symbol.toStringTag]: "CollectiveProposal",
          })) as unknown as DeriveCollectiveProposal[];
        },
      },
      elections: {
        info: async () => ({
          members: [], // Will be set by the component
        }),
      },
      chain: {
        bestNumber: async () => ({
          toNumber: () => 1000,
          toBigInt: () => BigInt(1000),
        }),
      },
    },
    consts: {
      council: {
        votingPeriod: {
          toNumber: () => 50400, // About 7 days with 12-second blocks
          toJSON: () => 50400,
        },
      },
      collective: {
        votingPeriod: {
          toNumber: () => 50400, // About 7 days with 12-second blocks
          toJSON: () => 50400,
        },
      },
    },
    registry: {
      chainDecimals: [12],
      chainTokens: ["UNIT"],
      chainSS58: 42,
      getModuleInstances: (specName: string, module: string) => {
        if (module === "council") return ["council"];
        if (module === "collective") return ["collective"];
        return undefined;
      },
    },
    runtimeVersion: {
      specName: {
        toString: () => "polkadot",
      },
    },
  };
};
