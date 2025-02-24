import type { SubmittableResult } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/promise/types";
import type { Signer } from "@polkadot/api/types";
import { web3FromAddress } from "@polkadot/extension-dapp/bundle";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { Callback } from "@polkadot/types/types";
import { mockVotes } from "./mock";

type Options = {
  signer?: Signer;
};

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
            statusCb({
              status: { isInBlock: true, isFinalized: false },
              events: [],
            } as any);
          }

          // Second update - transaction is finalized
          setTimeout(() => {
            if (statusCb) {
              statusCb({
                status: { isInBlock: true, isFinalized: true },
                events: [{ event: { method: "ExtrinsicSuccess" } }],
              } as any);
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
          statusCb({
            status: { isInBlock: true, isFinalized: true },
            events: [{ event: { method: "ExtrinsicSuccess" } }],
          } as any);
        }
        resolve(() => {});
      }, 1000);
    });
  }

  options = options || {};
  if (pair.meta.isInjected) {
    const injected = await web3FromAddress(pair.address);
    options.signer = injected.signer;
  }
  return tx.signAndSend(
    options.signer ? pair.address : pair,
    options,
    statusCb
  );
}
