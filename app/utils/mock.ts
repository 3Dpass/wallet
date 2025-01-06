import type { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import { Hash } from "@polkadot/types/interfaces";

// Mock storage for votes
export const mockVotes = new Map<string, { ayes: string[]; nays: string[] }>();

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
    },
    registry: {
      chainDecimals: [12],
      chainTokens: ["UNIT"],
      chainSS58: 42,
    },
  };
};
