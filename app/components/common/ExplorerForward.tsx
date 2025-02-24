const BASE_URL = "https://3dpscan.io";

export const ExplorerUrl = {
  extrinsic: (blockNumber: number, extrinsicIdx: number) =>
    `${BASE_URL}/extrinsic/${blockNumber}-${extrinsicIdx}`,
  account: ({ address }: { address?: string }) =>
    `${BASE_URL}/account/${address}`,
  block: ({ block }: { block?: string }) => `${BASE_URL}/block/${block}`,
};
