import { web3Accounts, web3Enable } from "@polkadot/extension-dapp";

export async function loadWeb3Accounts(genesisHash: string | null, ss58Format: number) {
  const extensions = await web3Enable("3dpass/wallet");
  if (extensions.length === 0) {
    return;
  }
  return await web3Accounts({ genesisHash, ss58Format });
}
