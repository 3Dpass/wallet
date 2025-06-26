import {
  addressToEvm,
  checkAddress,
  evmToAddress,
  isEthereumAddress,
} from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";

// Constants for blockchain configuration
export const EVM_CONTRACT_ADDRESS_PREFIX = '0xFBFBFBFA';
export const P3D_DECIMALS = 12;
export const P3D_DECIMALS_FACTOR = 10 ** P3D_DECIMALS;
export const EVM_ADDRESS_HEX_PADDING = 32;

/**
 * Generates an EVM contract address for a given asset ID.
 * @param assetId The asset ID.
 * @returns The EVM contract address.
 */
export function generateEvmContractAddress(assetId: number): string {
  const hexId = assetId.toString(16).padStart(EVM_ADDRESS_HEX_PADDING, '0');
  return EVM_CONTRACT_ADDRESS_PREFIX + hexId;
}

/**
 * Converts an SS58 address to an H160 address.
 * @param ss58Address The SS58 address.
 * @param ss58Format The SS58 format code (prefix).
 * @returns The H160 address.
 */
export function ss58ToH160(
  ss58Address: string,
  ss58Format: number
): string {
  try {
    if (!checkAddress(ss58Address, ss58Format)[0]) {
      throw new Error("Invalid SS58 address");
    }
    const evmAddressU8a = addressToEvm(ss58Address);
    return u8aToHex(evmAddressU8a);
  } catch (error) {
    console.error("Failed to convert SS58 to H160:", error);
    return "0x0000000000000000000000000000000000000000";
  }
}

/**
 * Converts an H160 address to an SS58 address.
 * @param h160Address The H160 address.
 * @param ss58Format The SS58 format code (prefix). Defaults to mainnet prefix.
 * @returns The SS58 address.
 */
export function h160ToSs58(
  h160Address: string,
  ss58Format: number
): string {
  try {
    if (!isEthereumAddress(h160Address)) {
      throw new Error("Invalid H160 address");
    }
    return evmToAddress(h160Address, ss58Format);
  } catch (error) {
    console.error("Failed to convert H160 to SS58:", error);
    return "";
  }
} 