import { Polkadot } from "@polkadot/react-identicon/icons";

type AddressIconProps = {
  address: string;
  size?: number;
  className?: string;
};

export function AddressIcon({ address, size = 24, className }: AddressIconProps) {
  return <Polkadot address={address} size={size} className={className} publicKey={address} />;
}
