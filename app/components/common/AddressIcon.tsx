import { Beachball } from "@polkadot/react-identicon/icons";

type AddressIconProps = {
  address: string;
  size?: number;
  className?: string;
};

export function AddressIcon({ address, size = 24, className }: AddressIconProps) {
  return <Beachball address={address} size={size} className={className} publicKey={address} />;
}
