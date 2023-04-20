import Moment from "react-moment";
import { Link, useParams } from "@remix-run/react";
import { Card, Divider, HTMLTable, Icon, Spinner } from "@blueprintjs/core";
import { decodeAddress } from "@polkadot/keyring";
import { u8aToHex } from "@polkadot/util";
import type { TransfersData, TransfersVars } from "../queries";
import { GET_TRANSFERS } from "../queries";
import { FormattedAmount } from "../components/common/FormattedAmount";
import { encodeAddress } from "@polkadot/util-crypto/address/encode";
import { useQuery } from "@apollo/client";
import Error from "../components/common/Error";
import { AddressItem } from "../components/common/AddressItem";
import { ExplorerUrl } from "../components/common/ExplorerForward";
import { useSS58Format } from "../hooks/useSS58Format";
import TitledValue from "../components/common/TitledValue";

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
      <TitledValue title="Address" value={<Link to={ExplorerUrl.account({ address })}>{address}</Link>} fontMono={true} />
      <Divider className="my-5" />
      <HTMLTable striped={true} width="100%">
        <thead>
          <tr>
            <th>Block</th>
            <th>Date</th>
            <th>Extrinsic</th>
            <th>Address</th>
            <th>
              <div className="text-right">Value</div>
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data &&
            data.getTransfers.objects.map((transfer) => {
              if (!ss58format) {
                return null;
              }
              const fromAddress = encodeAddress(transfer.fromMultiAddressAccountId, ss58format);
              const toAddress = encodeAddress(transfer.toMultiAddressAccountId, ss58format);
              const otherAddress = fromAddress != address ? fromAddress : toAddress;
              const outgoing = fromAddress == address;
              return (
                <tr key={`${transfer.blockNumber}:${transfer.extrinsicIdx}`}>
                  <td>
                    <Link to={`/block/${transfer.blockNumber}`}> {transfer.blockNumber}</Link>
                  </td>
                  <td>
                    <Moment date={transfer.blockDatetime} format="DD.MM.YY HH:MM" interval={0} />
                  </td>
                  <td>
                    <Link to={ExplorerUrl.extrinsic(transfer.blockNumber, transfer.extrinsicIdx)} target="_self">
                      {transfer.extrinsicIdx}
                    </Link>
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
