import { Link } from "@remix-run/react";
import { AddressIcon } from "./AddressIcon";

export function AddressItem({ address }) {
  return (
    <Link to={`/address/${address}`} className="flex">
      <AddressIcon address={address} />
      <div className="font-mono ml-2 text-ellipsis overflow-hidden">{address}</div>
    </Link>
  );
}
