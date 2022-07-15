import { useAtomValue } from "jotai";
import { polkadotApiAtom } from "../atoms";
import { useEffect, useState } from "react";
import { Icon } from "@blueprintjs/core";

export default function TransactionsClient({ address }) {
  const api = useAtomValue(polkadotApiAtom);
  const [locks, setLocks] = useState(null);

  useEffect(() => {
    setLocks(null);
    if (!api) {
      return;
    }
    api.query.balances.locks(address).then((locks) => {
      setLocks(locks.toHuman());
    });
  }, [api, address]);

  return (
    <>
      <div>
        <div>
          <Icon icon="lock" className="mr-1" /> Locks
        </div>
        {locks === null && <div>Loading...</div>}
        {locks !== null && locks.length == 0 && <div>No locks found.</div>}
        {locks !== null && locks && (
          <ul>
            {locks.map((lock) => {
              return (
                <li key={lock.id}>
                  {lock.amount} (id: {lock.id}, reasons: {lock.reasons})
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
