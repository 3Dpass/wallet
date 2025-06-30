import {
  Card,
  Classes,
  Icon,
  Intent,
  Spinner,
  Switch,
  Tag,
  Button,
} from "@blueprintjs/core";
import type { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import type { Option } from "@polkadot/types";
import type { Codec } from "@polkadot/types/types";
import { hexToString } from "@polkadot/util";
import { Link } from "@remix-run/react";
import { useApi } from "app/components/Api";
import { BountyDetails } from "app/components/governance/BountyDetails";
import { initializeMockBounties, mockBounties } from "app/utils/mock";
import { disableMockMode, enableMockMode } from "app/utils/sign";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import DialogProposeBounty from "app/components/dialogs/DialogProposeBounty";

interface Bounty {
  id: string;
  description: string;
  proposer: string;
  value: bigint;
  fee?: bigint;
  curator?: string;
  status: string;
  relatedMotions?: DeriveCollectiveProposal[];
}

interface BountyData extends Codec {
  proposer: { toString(): string };
  value: { toBigInt(): bigint };
  fee?: { toBigInt(): bigint };
  curator?: { toString(): string };
  status: { type: string };
}

export default function BountiesClient() {
  const { t } = useTranslation();
  const api = useApi();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!api) return;

    const loadBounties = async () => {
      try {
        if (isMockMode) {
          // Load mock bounties
          const loadedBounties = Array.from(mockBounties.entries()).map(
            ([id, bounty]) => ({
              id,
              ...bounty,
            })
          );
          setBounties(
            loadedBounties.sort((a, b) => Number(b.id) - Number(a.id))
          );
          setLoading(false);
          return;
        }

        // Get all bounty entries
        const bountyEntries = await api.query.bounties.bounties.entries();
        const motions = await api.derive.council.proposals();

        // Process each bounty
        const bountyPromises = bountyEntries.map(async ([key, bountyOpt]) => {
          const id = key.args[0].toString();
          const bountyOption = bountyOpt as Option<BountyData>;

          if (!bountyOption.isSome) {
            return null;
          }

          const bounty = bountyOption.unwrap();

          // Get bounty description
          const descriptionHash = (await api.query.bounties.bountyDescriptions(
            id
          )) as Option<Codec>;
          let description = "";

          if (descriptionHash.isSome) {
            try {
              description = hexToString(descriptionHash.unwrap().toHex());
            } catch (error) {
              console.error("Failed to decode description:", error);
              description = descriptionHash.toString();
            }
          }

          // Find related motions
          const relatedMotions = motions.filter((motion) => {
            if (!motion.proposal) return false;
            const { section, method: _method, args } = motion.proposal;
            if (section !== "bounties") return false;

            // Check if this motion is related to this bounty
            const bountyId = args[0]?.toString();
            return bountyId === id;
          });

          return {
            id,
            description,
            proposer: bounty.proposer.toString(),
            value: bounty.value.toBigInt(),
            fee: bounty.fee?.toBigInt(),
            curator: bounty.curator?.toString(),
            status: bounty.status.type,
            relatedMotions:
              relatedMotions.length > 0 ? relatedMotions : undefined,
          } as Bounty;
        });

        const loadedBounties = (await Promise.all(bountyPromises)).filter(
          (b): b is Bounty => b !== null
        );
        // Sort bounties by ID in descending order
        setBounties(loadedBounties.sort((a, b) => Number(b.id) - Number(a.id)));
      } catch (error) {
        console.error("Failed to load bounties:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBounties();
  }, [api, isMockMode]);

  const handleMockModeToggle = () => {
    if (!isMockMode) {
      enableMockMode();
      initializeMockBounties();
    } else {
      disableMockMode();
      setBounties([]);
    }
    setIsMockMode(!isMockMode);
    setLoading(true); // Force reload of bounties
  };

  const handleOpenDialog = useCallback(() => setDialogOpen(true), []);
  const handleCloseDialog = useCallback(() => setDialogOpen(false), []);

  const handleBountyProposed = useCallback(() => {
    setDialogOpen(false);
    setLoading(true);
    // reload bounties
    setTimeout(() => {
      // Give time for block inclusion
      setLoading(false);
    }, 2000);
  }, []);

  if (loading) {
    return <Spinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className={Classes.HEADING}>{t("governance.bounties")}</h2>
        <div className="flex items-center gap-2">
          {process.env.NODE_ENV === "development" && (
            <Switch
              checked={isMockMode}
              label={t("governance.mock_mode")}
              onChange={handleMockModeToggle}
            />
          )}
          <Button
            icon="plus"
            intent="primary"
            text={t("governance.propose_bounty") || "+ Propose bounty"}
            onClick={handleOpenDialog}
          />
        </div>
      </div>
      <DialogProposeBounty
        isOpen={dialogOpen}
        onClose={handleCloseDialog}
        onProposed={handleBountyProposed}
      />
      <div className="space-y-3">
        {bounties.length === 0 ? (
          <Card>
            <Tag intent={Intent.WARNING}>
              {t("governance.no_active_bounties")}
            </Tag>
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
                    <BountyDetails
                      bountyId={bounty.id}
                      type="approval"
                      motion={null as unknown as DeriveCollectiveProposal}
                      showHeader={false}
                    />
                  </div>
                  {bounty.relatedMotions &&
                    bounty.relatedMotions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t("governance.related_motions")}
                        </h4>
                        <div className="space-y-2">
                          {bounty.relatedMotions.map((motion) => {
                            const hash = motion.hash?.toString();
                            if (!hash) return null;

                            const section = motion.proposal?.section;
                            const method = motion.proposal?.method;

                            return (
                              <div
                                key={hash}
                                className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded p-2"
                              >
                                <div className="flex items-center gap-2">
                                  <Tag
                                    minimal
                                    intent={Intent.PRIMARY}
                                    className="whitespace-nowrap"
                                  >
                                    #{motion.votes?.index.toString()}
                                  </Tag>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {section}.{method}
                                  </span>
                                </div>
                                <Link
                                  to={`/governance/motions?highlight=${hash}`}
                                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                >
                                  {t("governance.view_motion")}
                                  <Icon icon="arrow-right" size={12} />
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
