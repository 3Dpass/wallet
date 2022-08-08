import { useParams } from "@remix-run/react";
import { Card, HTMLTable, Spinner, SpinnerSize } from "@blueprintjs/core";
import { ClientOnly } from "remix-utils";
import { apiAtom, apiExplorerAtom } from "../../atoms";
import { useAtomValue } from "jotai";
import { lazy, useEffect, useState } from "react";
import { decodeAddress } from "@polkadot/keyring";
import { u8aToHex } from "@polkadot/util";
import { gql } from "@apollo/client";
import { AddressIcon } from "../../components/common/AddressIcon";
import { encodeAddress } from "@polkadot/util-crypto/address/encode";
import { ss58format } from "../../api.config";

const TitledValue = lazy(() => import("../../components/common/TitledValue"));
const Divider = lazy(() => import("@blueprintjs/core").then((module) => ({ default: module.Divider })));

export default function Address() {
  const api = useAtomValue(apiAtom);
  const apiExplorer = useAtomValue(apiExplorerAtom);
  const { address } = useParams();
  const [transfers, setTransfers] = useState([]);

  useEffect(() => {
    if (!apiExplorer) {
      return;
    }

    async function loadTransfers() {
      const accountIdHex = u8aToHex(decodeAddress(address));
      const result = await apiExplorer.query({
        query: gql`
          query {
            getTransfers(
              pageSize: 100
              pageKey: "1"
              filters: {
                or: [
                  { fromMultiAddressAccountId: "${accountIdHex}" }
                  { toMultiAddressAccountId: "${accountIdHex}" }
                ]
              }
            ) {
              pageInfo {
                pageSize
                pageNext
              }
              objects {
                blockNumber
                extrinsicIdx
                fromMultiAddressAccountId
                toMultiAddressAccountId
                value
                blockDatetime
                complete
              }
            }
          }
        `,
      });
      setTransfers(result.data.getTransfers.objects);
    }

    loadTransfers();
  }, [address, apiExplorer]);

  if (!api) {
    return <Spinner />;
  }

  return (
    <Card>
      <ClientOnly fallback={<Spinner size={SpinnerSize.SMALL} />}>
        {() => (
          <>
            <TitledValue title="Address" value={address} fontMono={true} />
            <Divider className="my-5" />
            <HTMLTable striped={true}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>From</th>
                  <th>
                    <div className="text-right">Value</div>
                  </th>
                  <th>To</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer) => {
                  return (
                    <tr>
                      <td>{transfer.blockDatetime}</td>
                      <td>
                        <AddressItem accountId={transfer.fromMultiAddressAccountId} />
                      </td>
                      <td className="font-mono">
                        <div className="text-right">{transfer.value}</div>
                      </td>
                      <td>
                        <AddressItem accountId={transfer.toMultiAddressAccountId} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </HTMLTable>
          </>
        )}
      </ClientOnly>
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
