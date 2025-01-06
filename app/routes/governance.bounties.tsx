import { useTranslation } from "react-i18next";
import { Card, Spinner, Tag, Intent, Classes } from "@blueprintjs/core";
import { useApi } from "app/components/Api";
import { useEffect, useState } from "react";
import { hexToString } from "@polkadot/util";
import { BountyDetails } from "app/components/governance/BountyDetails";
import type { Option } from "@polkadot/types";
import type { Codec } from "@polkadot/types/types";

interface Bounty {
  id: string;
  description: string;
  proposer: string;
  value: bigint;
  fee?: bigint;
  curator?: string;
  status: string;
}

interface BountyData extends Codec {
  proposer: { toString(): string };
  value: { toBigInt(): bigint };
  fee?: { toBigInt(): bigint };
  curator?: { toString(): string };
  status: { type: string };
}

export default function Bounties() {
  const { t } = useTranslation();
  const api = useApi();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) return;

    const loadBounties = async () => {
      try {
        // Get all bounty entries
        const bountyEntries = await api.query.bounties.bounties.entries();

        // Process each bounty
        const bountyPromises = bountyEntries.map(async ([key, bountyOpt]) => {
          const id = key.args[0].toString();
          const bountyOption = bountyOpt as Option<BountyData>;

          if (!bountyOption.isSome) {
            return null;
          }

          const bounty = bountyOption.unwrap();

          // Get bounty description
          const descriptionHash = (await api.query.bounties.bountyDescriptions(id)) as Option<Codec>;
          let description = "";

          if (descriptionHash.isSome) {
            try {
              description = hexToString(descriptionHash.unwrap().toHex());
            } catch (error) {
              console.error("Failed to decode description:", error);
              description = descriptionHash.toString();
            }
          }

          return {
            id,
            description,
            proposer: bounty.proposer.toString(),
            value: bounty.value.toBigInt(),
            fee: bounty.fee?.toBigInt(),
            curator: bounty.curator?.toString(),
            status: bounty.status.type,
          } as Bounty;
        });

        const loadedBounties = (await Promise.all(bountyPromises)).filter((b): b is Bounty => b !== null);
        // Sort bounties by ID in descending order
        setBounties(loadedBounties.sort((a, b) => Number(b.id) - Number(a.id)));
      } catch (error) {
        console.error("Failed to load bounties:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBounties();
  }, [api]);

  if (loading) {
    return <Spinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className={Classes.HEADING}>{t("governance.bounties")}</h2>
      </div>
      <div className="space-y-3">
        {bounties.length === 0 ? (
          <Card>
            <Tag intent={Intent.WARNING}>{t("governance.no_active_bounties")}</Tag>
          </Card>
        ) : (
          bounties.map((bounty) => (
            <Card key={bounty.id} className="mb-3">
              <div className="flex justify-between items-start">
                <div className="w-full">
                  <div className="flex items-center gap-2">
                    <Tag minimal round intent={Intent.PRIMARY}>
                      #{bounty.id}
                    </Tag>
                  </div>
                  <div className="mt-6">
                    <BountyDetails bountyId={bounty.id} type="approval" motion={null as any} showHeader={false} />
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
