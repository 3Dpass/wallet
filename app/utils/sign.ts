import type { SubmittableExtrinsic } from "@polkadot/api/promise/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import { web3FromAddress } from "@polkadot/extension-dapp/bundle";
import type { Signer } from "@polkadot/api/types";
import type { Callback } from "@polkadot/types/types";
import type { SubmittableResult } from "@polkadot/api";

type Options = {
  signer?: Signer;
};

export async function signAndSend(tx: SubmittableExtrinsic, pair: KeyringPair, options?: Options, statusCb?: Callback<SubmittableResult>) {
  options = options || {};
  if (pair.meta.isInjected) {
    const injected = await web3FromAddress(pair.address);
    options.signer = injected.signer;
  }
  return tx.signAndSend(options.signer ? pair.address : pair, options, statusCb);
}
