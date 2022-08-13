import Moment from "react-moment";
import { Link, useParams } from "@remix-run/react";
import { Card, HTMLTable, Icon, Spinner } from "@blueprintjs/core";
import { apiAtom, apiExplorerAtom } from "../../atoms";
import { useAtomValue } from "jotai";
import { lazy, useEffect, useState } from "react";
import { decodeAddress } from "@polkadot/keyring";
import { u8aToHex } from "@polkadot/util";
import { AddressIcon } from "../../components/common/AddressIcon";
import type { ITransfer } from "../../queries";
import { getTransfers } from "../../queries";
import { FormattedAmount } from "../../components/common/FormattedAmount";
import { encodeAddress } from "@polkadot/util-crypto/address/encode";
import { ss58format } from "../../api.config";

const TitledValue = lazy(() => import("../../components/common/TitledValue"));
const Divider = lazy(() => import("@blueprintjs/core").then((module) => ({ default: module.Divider })));

export default function Address() {
  const { address } = useParams();
  const api = useAtomValue(apiAtom);
  const apiExplorer = useAtomValue(apiExplorerAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [transfers, setTransfers] = useState<ITransfer[]>([]);

  useEffect(() => {
    async function loadTransfers() {
      if (!apiExplorer) {
        return false;
      }
      setIsLoading(true);
      const accountIdHex = u8aToHex(decodeAddress(address));
      const result = await apiExplorer.query({
        query: getTransfers(accountIdHex),
      });
      setTransfers(result.data.getTransfers.objects);
      setIsLoading(false);
    }

    loadTransfers().then();
  }, [address, apiExplorer]);

  if (!api) {
    return <Spinner />;
  }

  return (
    <Card>
      <TitledValue title="Address" value={address} fontMono={true} />
      <Divider className="my-5" />
      {isLoading && <Spinner />}
      {!isLoading && (
        <HTMLTable striped={true}>
          <thead>
            <tr>
              <th>Block</th>
              <th>Date</th>
              <th>Address</th>
              <th></th>
              <th>
                <div className="text-right">Value</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer) => {
              const fromAddress = encodeAddress(transfer.fromMultiAddressAccountId, ss58format);
              const toAddress = encodeAddress(transfer.toMultiAddressAccountId, ss58format);
              const otherAddress = fromAddress != address ? fromAddress : toAddress;
              const outgoing = fromAddress == address;
              return (
                <tr key={`${transfer.blockNumber}:${transfer.extrinsicIdx}`}>
                  <td>
                    <Link to={`/block/${transfer.blockNumber}`}>{transfer.blockNumber}</Link>
                  </td>
                  <td>
                    <Moment date={transfer.blockDatetime} format="DD.MM.YY HH:MM" interval={0} />
                  </td>
                  <td>
                    <AddressItem address={otherAddress} />
                  </td>
                  <td>{outgoing ? <Icon icon="remove" className="text-red-500" /> : <Icon icon="add" className="text-green-500" />}</td>
                  <td className="font-mono">
                    <div className="text-right">
                      <FormattedAmount value={transfer.value} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </HTMLTable>
      )}
    </Card>
  );
}

function AddressItem({ address }) {
  return (
    <Link to={`/address/${address}`} className="flex">
      <AddressIcon address={address} />
      <div className="font-mono ml-2">{address}</div>
    </Link>
  );
}
