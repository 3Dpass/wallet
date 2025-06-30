import { u8aToHex } from "@polkadot/util";
import {
  addressToEvm,
  checkAddress,
  evmToAddress,
  isEthereumAddress,
} from "@polkadot/util-crypto";

// Constants for blockchain configuration
export const EVM_CONTRACT_ADDRESS_PREFIX = "0xFBFBFBFA";
export const P3D_DECIMALS = 12;
export const P3D_DECIMALS_FACTOR = 10 ** P3D_DECIMALS;
export const EVM_ADDRESS_HEX_PADDING = 32;

/**
 * Converts a string representation of a number to a BigInt in the chain's smallest unit.
 * This function handles decimal values by splitting the string and padding correctly,
 * avoiding floating-point inaccuracies.
 *
 * @param amount The amount as a string, e.g., "123.456".
 * @param decimals The number of decimals for the token.
 * @returns The amount in the smallest chain unit as a BigInt.
 */
export function toChainUnit(amount: string, decimals: number): bigint {
  if (!amount) {
    return 0n;
  }

  if (amount.startsWith(".")) {
    amount = "0" + amount;
  }

  const [integer, fraction = ""] = amount.split(".");

  const safeInteger = integer || "0";

  const truncatedFraction = fraction.slice(0, decimals);
  const paddedFraction = truncatedFraction.padEnd(decimals, "0");

  const chainValueString = `${safeInteger}${paddedFraction}`;

  return BigInt(chainValueString);
}

/**
 * Generates an EVM contract address for a given asset ID.
 * @param assetId The asset ID.
 * @returns The EVM contract address.
 */
export function generateEvmContractAddress(assetId: number): string {
  const hexId = assetId.toString(16).padStart(EVM_ADDRESS_HEX_PADDING, "0");
  return EVM_CONTRACT_ADDRESS_PREFIX + hexId;
}

/**
 * Converts an SS58 address to an H160 address.
 * @param ss58Address The SS58 address.
 * @param ss58Format The SS58 format code (prefix).
 * @returns The H160 address.
 */
export function ss58ToH160(ss58Address: string, ss58Format: number): string {
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
export function h160ToSs58(h160Address: string, ss58Format: number): string {
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
