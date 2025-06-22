import {
  addressToEvm,
  checkAddress,
  evmToAddress,
  isEthereumAddress,
} from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";

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