import { Icon, IconSize } from "@blueprintjs/core";
import { Link } from "@remix-run/react";
import { AddressIcon } from "./AddressIcon";

export function AddressItem({ address }: { address: string }) {
  return (
    <Link to={`/address/${address}`} className="flex text-white no-underline group" onMouseEnter={() => console.log('hit')}>
      <AddressIcon address={address} />
      <div className="font-mono ml-2 text-ellipsis overflow-hidden border-b border-b-gray-500 group-hover:border-b-white">{address}</div>
      <Icon
        className="bp4-icon bp4-intent-success"
        style={{'position': 'absolute', 'right': '5px'}}
        icon="endorsed"
        size={IconSize.LARGE}
      />
    </Link>
  );
}
