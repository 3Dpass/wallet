const { decodeAddress, encodeAddress } = require("@polkadot/keyring");
const { hexToU8a, isHex } = require("@polkadot/util");

export const isValidPolkadotAddress = (address) => {
  try {
    encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address));
    return true;
  } catch (error) {
    return false;
  }
};
