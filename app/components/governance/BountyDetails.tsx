import {
  Button,
  H4,
  HTMLTable,
  Icon,
  Intent,
  Spinner,
  Tag,
} from "@blueprintjs/core";
import type { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import type { Bytes, Option } from "@polkadot/types";
import type { Bounty } from "@polkadot/types/interfaces";
import keyring from "@polkadot/ui-keyring";
import { hexToString } from "@polkadot/util";
import { lastSelectedAccountAtom } from "app/atoms";
import { useApi } from "app/components/Api";
import { AccountName } from "app/components/common/AccountName";
import { FormattedAmount } from "app/components/common/FormattedAmount";
import DialogAwardBounty from "app/components/dialogs/DialogAwardBounty";
import useToaster from "app/hooks/useToaster";
import { mockBounties } from "app/utils/mock";
import { signAndSend } from "app/utils/sign";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BountyNextAction } from "./BountyNextAction";
import { BountyProgress } from "./BountyProgress";

interface MockBountyData {
  proposer: { toString: () => string };
  value: { toBigInt: () => bigint };
  fee?: { toBigInt: () => bigint | undefined };
  curator?: { toString: () => string | undefined };
  status: {
    type: string;
    asActive?: {
      curator: { toString: () => string | undefined };
      updateDue: { toBigInt: () => bigint };
    };
    asPendingPayout?: {
      curator: { toString: () => string | undefined };
      unlockAt: { toBigInt: () => bigint };
    };
    asCuratorProposed?: {
      curator: { toString: () => string | undefined };
    };
  };
}

interface BountyDetailsProps {
  bountyId: string;
  motion: DeriveCollectiveProposal;
  type: "approval" | "curator" | "close";
  curator?: string;
  fee?: bigint;
  showHeader?: boolean;
}

// Helper function to get icon props based on bounty type
function getBountyIcon(type: "approval" | "curator" | "close") {
  switch (type) {
    case "approval":
      return {
        icon: "endorsed" as const,
        className: "text-green-600 dark:text-green-400",
      };
    case "curator":
      return {
        icon: "user" as const,
        className: "text-blue-600 dark:text-blue-400",
      };
    case "close":
      return {
        icon: "disable" as const,
        className: "text-red-600 dark:text-red-400",
      };
  }
}

export function BountyDetails({
  bountyId,
  motion: _motion,
  type,
  curator,
  fee,
  showHeader = true,
}: BountyDetailsProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [bountyData, setBountyData] = useState<Bounty | MockBountyData | null>(
    null
  );
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bestNumber, setBestNumber] = useState<bigint | undefined>(undefined);
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const isMockMode =
    process.env.NODE_ENV === "development" && mockBounties.size > 0;

  useEffect(() => {
    if (!api) return;

    const loadBounty = async () => {
      setLoading(true);
      try {
        if (isMockMode) {
          const mockBounty = mockBounties.get(bountyId);
          if (mockBounty) {
            const mockBountyData = {
              proposer: { toString: () => mockBounty.proposer },
              value: { toBigInt: () => mockBounty.value },
              fee: mockBounty.fee
                ? { toBigInt: () => mockBounty.fee }
                : undefined,
              curator: mockBounty.curator
                ? { toString: () => mockBounty.curator }
                : undefined,
              status: {
                type: mockBounty.status,
                ...(mockBounty.status === "Active" && {
                  asActive: {
                    curator: { toString: () => mockBounty.curator },
                    updateDue: { toBigInt: () => BigInt(1000) },
                  },
                }),
                ...(mockBounty.status === "PendingPayout" && {
                  asPendingPayout: {
                    curator: { toString: () => mockBounty.curator },
                    unlockAt: { toBigInt: () => BigInt(2000) },
                  },
                }),
                ...(mockBounty.status === "CuratorProposed" && {
                  asCuratorProposed: {
                    curator: { toString: () => mockBounty.curator },
                  },
                }),
              },
            };
            setBountyData(mockBountyData);
            setDescription(mockBounty.description);
          } else {
            setBountyData(null);
          }
        } else {
          const bountyInfo = (await api.query.bounties.bounties(
            bountyId
          )) as Option<Bounty>;
          const unwrapped = bountyInfo.unwrapOr(null);

          // Fetch description from bounty description storage
          const descriptionHash = (await api.query.bounties.bountyDescriptions(
            bountyId
          )) as Option<Bytes>;
          if (descriptionHash.isSome) {
            const rawDescription = descriptionHash.unwrap();
            try {
              const decodedDescription = hexToString(rawDescription.toHex());
              setDescription(decodedDescription);
            } catch (error) {
              console.error("Failed to decode description:", error);
              setDescription(rawDescription.toString());
            }
          }

          setBountyData(unwrapped);
        }
      } catch (error) {
        console.error("Failed to load bounty:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBounty();

    // Subscribe to best number updates
    let unsubscribe: (() => void) | undefined;
    api.derive.chain
      .bestNumber((number) => {
        setBestNumber(number.toBigInt());
      })
      .then((unsub) => {
        unsubscribe = unsub;
      });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [api, bountyId, isMockMode, refreshTrigger]);

  const title = {
    approval: "Approve Bounty",
    curator: "Propose Curator for Bounty",
    close: "Close Bounty",
  }[type];

  const reloadBounty = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div>
        <H4 className="flex items-center gap-2">
          <Icon {...getBountyIcon(type)} />
          {title} #{bountyId}
        </H4>
        <div className="flex items-center gap-2 mt-2">
          <Spinner size={16} /> {t("common.loading")}
        </div>
      </div>
    );
  }

  if (!bountyData) {
    return (
      <div>
        <H4 className="flex items-center gap-2">
          <Icon {...getBountyIcon(type)} />
          {title} #{bountyId}
        </H4>
        <Tag intent={Intent.DANGER} className="mt-2">
          {t("governance.bounty_not_found")}
        </Tag>
      </div>
    );
  }

  const status = bountyData.status?.type;
  const curatorAddress =
    (status === "CuratorProposed" &&
      bountyData.status.asCuratorProposed?.curator?.toString()) ||
    (status === "Active" &&
      bountyData.status.asActive?.curator?.toString()) ||
    (status === "PendingPayout" &&
      bountyData.status.asPendingPayout?.curator?.toString()) ||
    "";
  const pendingPayoutUnlockAt =
    status === "PendingPayout"
      ? bountyData.status.asPendingPayout?.unlockAt?.toBigInt()
      : undefined;
  const canClaim =
    pendingPayoutUnlockAt !== undefined &&
    bestNumber !== undefined &&
    pendingPayoutUnlockAt <= bestNumber;

  const pair = (() => {
    try {
      if (selectedAccount && selectedAccount.trim() !== "") {
        return keyring.getPair(selectedAccount);
      }
      return null;
    } catch (error) {
      console.warn("Failed to get keyring pair:", error);
      return null;
    }
  })();

  const handleClaimPayout = () => {
    if (!api) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "API not ready",
      });
      return;
    }
    if (!pair) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message:
          t("messages.lbl_no_account_selected") ||
          "No account selected or unable to get keyring pair.",
      });
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_account_locked") || "Account is locked.",
      });
      return;
    }

    setClaimLoading(true);
    try {
      const tx = api.tx.bounties.claimBounty(bountyId);
      void signAndSend(tx, pair, {}, ({ status }) => {
        if (!status.isInBlock) return;
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message:
            t("governance.bounty_payout_claimed") ||
            "Bounty payout claimed successfully!",
        });
        setClaimLoading(false);
        reloadBounty();
      }).catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: errorMessage,
        });
        setClaimLoading(false);
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: errorMessage,
      });
      setClaimLoading(false);
    }
  };

  return (
    <div className="max-w-4xl w-full">
      <DialogAwardBounty
        bountyId={bountyId}
        isOpen={awardDialogOpen}
        onAwarded={reloadBounty}
        onClose={() => setAwardDialogOpen(false)}
      />
      {showHeader && (
        <div className="mb-3">
          <H4 className="flex items-center gap-2">
            <Icon {...getBountyIcon(type)} />
            {title} #{bountyId}
          </H4>
        </div>
      )}
      {bountyData?.status && (
        <BountyProgress currentStatus={bountyData.status.type} />
      )}
      <HTMLTable striped className="w-full">
        <tbody>
          {bountyData?.status && (
            <tr>
              <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                {t("governance.next_step")}
              </td>
              <td className="flex gap-2 items-center">
                <BountyNextAction
                  status={bountyData.status.type}
                  updateDue={
                    bountyData.status.type === "Active"
                      ? bountyData.status.asActive?.updateDue?.toBigInt()
                      : undefined
                  }
                  unlockAt={
                    bountyData.status.type === "PendingPayout"
                      ? bountyData.status.asPendingPayout?.unlockAt?.toBigInt()
                      : undefined
                  }
                  bestNumber={bestNumber}
                />
              </td>
            </tr>
          )}
          {(status === "Active" || status === "PendingPayout") && (
            <tr>
              <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                {t("governance.bounty_actions") || "Actions"}
              </td>
              <td className="flex gap-2 items-center">
                {status === "Active" && (
                  <Button
                    icon="endorsed"
                    intent={Intent.PRIMARY}
                    onClick={() => setAwardDialogOpen(true)}
                    text={t("governance.award_bounty") || "Award bounty"}
                  />
                )}
                {status === "PendingPayout" && (
                  <Button
                    disabled={!canClaim || claimLoading}
                    icon="send-to"
                    intent={Intent.SUCCESS}
                    loading={claimLoading}
                    onClick={handleClaimPayout}
                    text={t("governance.claim_bounty_payout") || "Claim payout"}
                  />
                )}
              </td>
            </tr>
          )}
          {bountyData?.status &&
            curatorAddress && (
              <tr>
                <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                  {t("governance.curator")}
                </td>
                <td>
                  <AccountName address={curatorAddress} />
                </td>
              </tr>
            )}
          {description && (
            <tr>
              <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                {t("governance.description")}
              </td>
              <td>{description}</td>
            </tr>
          )}
          {type === "curator" && curator && (
            <tr>
              <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                {t("governance.curator")}
              </td>
              <td>
                <AccountName address={curator} />
              </td>
            </tr>
          )}
          {type === "curator" && fee !== undefined && fee !== BigInt(0) && (
            <tr>
              <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                {t("governance.curator_fee")}
              </td>
              <td>
                <FormattedAmount value={fee} />
              </td>
            </tr>
          )}
          <tr>
            <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
              {type === "approval"
                ? t("governance.value")
                : t("governance.bounty_value")}
            </td>
            <td>
              <FormattedAmount value={bountyData.value.toBigInt()} />
            </td>
          </tr>
          {bountyData.fee &&
            type === "approval" &&
            bountyData.fee.toBigInt() !== BigInt(0) && (
              <tr>
                <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                  {t("governance.fee")}
                </td>
                <td>
                  <FormattedAmount value={bountyData.fee?.toBigInt() ?? 0} />
                </td>
              </tr>
            )}
          {bountyData.proposer && (
            <tr>
              <td className="text-gray-500 whitespace-nowrap pr-8 w-0">
                {t("governance.proposer")}
              </td>
              <td>
                <AccountName address={bountyData.proposer.toString()} />
              </td>
            </tr>
          )}
        </tbody>
      </HTMLTable>
    </div>
  );
}
