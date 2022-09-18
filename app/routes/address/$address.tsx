import Moment from "react-moment";
import { Link, useParams } from "@remix-run/react";
import { Card, HTMLTable, Icon, Spinner } from "@blueprintjs/core";
import { lazy } from "react";
import { decodeAddress } from "@polkadot/keyring";
import { u8aToHex } from "@polkadot/util";
import type { TransfersData, TransfersVars } from "../../queries";
import { GET_TRANSFERS } from "../../queries";
import { FormattedAmount } from "../../components/common/FormattedAmount";
import { encodeAddress } from "@polkadot/util-crypto/address/encode";
import { useSS58Format } from "../../components/hooks";
import { useQuery } from "@apollo/client";
import Error from "../../components/common/Error";
import { AddressItem } from "../../components/common/AddressItem";

const TitledValue = lazy(() => import("../../components/common/TitledValue"));
const Divider = lazy(() => import("@blueprintjs/core").then((module) => ({ default: module.Divider })));

export default function Address() {
  const { address } = useParams();
  const accountIdHex = u8aToHex(decodeAddress(address));
  const ss58format = useSS58Format();

  const { loading, error, data } = useQuery<TransfersData, TransfersVars>(GET_TRANSFERS, {
    variables: { accountId: accountIdHex },
  });
  if (loading) return <Spinner />;
  if (error) return <Error>Error fetching transactions data, try to reload.</Error>;

  return (
    <Card>
      <TitledValue title="Address" value={address} fontMono={true} />
      <Divider className="my-5" />
      <HTMLTable striped={true} width="100%">
        <thead>
          <tr>
            <th>Block</th>
            <th>Date</th>
            <th>Address</th>
            <th>
              <div className="text-right">Value</div>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.getTransfers.objects.map((transfer) => {
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
                <td className="font-mono">
                  <div className="text-right">
                    <FormattedAmount value={transfer.value} />
                  </div>
                </td>
                <td>{outgoing ? <Icon icon="remove" className="text-red-500" /> : <Icon icon="add" className="text-green-500" />}</td>
              </tr>
            );
          })}
        </tbody>
      </HTMLTable>
    </Card>
  );
}
