import { useParams } from "@remix-run/react";
import { Card, HTMLTable, Icon, Spinner } from "@blueprintjs/core";
import { apiAtom, apiExplorerAtom } from "../../atoms";
import { useAtomValue } from "jotai";
import { lazy, useEffect, useState } from "react";
import { decodeAddress } from "@polkadot/keyring";
import { u8aToHex } from "@polkadot/util";
import { AddressIcon } from "../../components/common/AddressIcon";
import { encodeAddress } from "@polkadot/util-crypto/address/encode";
import { ss58format } from "../../api.config";
import { getTransfers } from "../../queries";
import { FormattedAmount } from "../../components/common/FormattedAmount";
import Moment from "react-moment";

const TitledValue = lazy(() => import("../../components/common/TitledValue"));
const Divider = lazy(() => import("@blueprintjs/core").then((module) => ({ default: module.Divider })));

export default function Address() {
  const { address } = useParams();
  const api = useAtomValue(apiAtom);
  const apiExplorer = useAtomValue(apiExplorerAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [transfers, setTransfers] = useState([]);

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

    loadTransfers();
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
              const otherAddress =
                transfer.fromMultiAddressAccountId != address ? transfer.fromMultiAddressAccountId : transfer.toMultiAddressAccountId;
              const outgoing = transfer.fromMultiAddressAccountId == address;
              return (
                <tr key={`${transfer.blockNumber}:${transfer.extrinsicIdx}`}>
                  <td>{transfer.blockNumber}</td>
                  <td>
                    <Moment date={transfer.blockDatetime} format="DD.MM" interval={0} className="" />
                    <Moment date={transfer.blockDatetime} format=".YYYY HH:MM" interval={0} className="opacity-50" />
                  </td>
                  <td>
                    <AddressItem accountId={otherAddress} />
                  </td>
                  <td>{outgoing ? <Icon icon="upload" className="text-red-500" /> : <Icon icon="download" className="text-green-500" />}</td>
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

function AddressItem({ accountId }) {
  const address = encodeAddress(accountId, ss58format);
  return (
    <div className="flex">
      <AddressIcon address={address} />
      <div className="font-mono ml-2">{address}</div>
    </div>
  );
}
