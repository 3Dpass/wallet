import type { SubmittableResult } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/promise/types";
import type { Signer } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { EventRecord } from "@polkadot/types/interfaces";
import type { Callback } from "@polkadot/types/types";
import { mockVotes } from "./mock";

// Type for the web3FromAddress function
type Web3FromAddress = (address: string) => Promise<{ signer: Signer }>;

type Options = {
  signer?: Signer;
};

// Mock type for SubmittableResult
type MockSubmittableResult = {
  readonly events: EventRecord[];
  readonly status: {
    isInBlock: boolean;
    isFinalized: boolean;
    isInvalid: boolean;
    isUsurped: boolean;
    isReady: boolean;
    isBroadcast: boolean;
    isFuture: boolean;
    isDropped: boolean;
  };
  readonly isCompleted: boolean;
  readonly isError: boolean;
  readonly isFinalized: boolean;
  readonly isInBlock: boolean;
  readonly isWarning: boolean;
  readonly txHash: string;
  readonly txIndex: number;
  filterRecords: <T = EventRecord>() => T[];
  findRecord: <T = EventRecord>() => T | undefined;
  toHuman: () => Record<string, unknown>;
};

// Create mock result with default values
const createMockResult = (isFinalized = false): SubmittableResult =>
  ({
    events: [],
    status: {
      isInBlock: true,
      isFinalized,
      isInvalid: false,
      isUsurped: false,
      isReady: false,
      isBroadcast: false,
      isFuture: false,
      isDropped: false,
    },
    isCompleted: isFinalized,
    isError: false,
    isFinalized,
    isInBlock: true,
    isWarning: false,
    txHash:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    txIndex: 0,
    filterRecords: <T = EventRecord>() => [] as T[],
    findRecord: <T = EventRecord>() => undefined,
    toHuman: () => ({}),
  }) as unknown as SubmittableResult;

// Flag to enable/disable mock mode
let isMockMode = false;

export const enableMockMode = () => {
  isMockMode = true;
};

export const disableMockMode = () => {
  isMockMode = false;
};

export async function signAndSend(
  tx: SubmittableExtrinsic,
  pair: KeyringPair,
  options?: Options,
  statusCb?: Callback<SubmittableResult>
) {
  if (isMockMode) {
    // Extract vote information from the transaction
    const section = tx.method.section;
    const method = tx.method.method;

    if (section === "council" && method === "vote") {
      const [hash, index, approve] = tx.args;
      const votes = mockVotes.get(hash.toString()) || { ayes: [], nays: [] };

      if (approve) {
        votes.ayes = [...new Set([...votes.ayes, pair.address])];
        votes.nays = votes.nays.filter((a) => a !== pair.address);
      } else {
        votes.nays = [...new Set([...votes.nays, pair.address])];
        votes.ayes = votes.ayes.filter((a) => a !== pair.address);
      }

      mockVotes.set(hash.toString(), votes);

      // Return a promise that resolves with the unsubscribe function
      return new Promise<() => void>((resolve) => {
        // First update - transaction is in block
        setTimeout(() => {
          if (statusCb) {
            statusCb(createMockResult(false));
          }

          // Second update - transaction is finalized
          setTimeout(() => {
            if (statusCb) {
              statusCb(createMockResult(true));
            }
            resolve(() => {});
          }, 500);
        }, 500);
      });
    }

    // For non-vote transactions, just simulate success
    return new Promise<() => void>((resolve) => {
      setTimeout(() => {
        if (statusCb) {
          statusCb(createMockResult(true));
        }
        resolve(() => {});
      }, 1000);
    });
  }

  const finalOptions = options || {};
  if (pair.meta.isInjected) {
    // Dynamically import web3FromAddress when needed
    let web3FromAddress: ((address: string) => Promise<{ signer: Signer }>) | null = null;
    if (typeof window !== 'undefined') {
      try {
        const module = await import("@polkadot/extension-dapp/bundle");
        web3FromAddress = module.web3FromAddress;
      } catch {
        console.warn("Polkadot extension-dapp not available, falling back to direct signing");
      }
    }
    if (web3FromAddress) {
      const injected = await web3FromAddress(pair.address);
      finalOptions.signer = injected.signer;
    } else {
      console.warn("Polkadot extension-dapp not available, falling back to direct signing");
    }
  }
  return tx.signAndSend(
    finalOptions.signer ? pair.address : pair,
    finalOptions,
    statusCb
  );
}
