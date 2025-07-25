import { Intent, Tag } from "@blueprintjs/core";
import type { u32 } from "@polkadot/types";
import { useApi } from "app/components/Api";
import { formatTimeLeft } from "app/utils/time";
import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function TimeUntilFunding() {
  const api = useApi();
  const { t } = useTranslation();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [spendPeriod, setSpendPeriod] = useState<number | null>(null);

  useEffect(() => {
    if (!api) return;

    const updateTime = async () => {
      try {
        // Get the spend period from treasury constants
        const spendPeriodBlocks = (
          api.consts.treasury.spendPeriod as u32
        ).toNumber();
        setSpendPeriod(spendPeriodBlocks);

        // Get current block number
        const bestNumber = await api.derive.chain.bestNumber();
        const current = bestNumber.toNumber();
        setCurrentBlock(current);

        // Calculate remaining blocks until next spend period
        const remainingBlocks =
          spendPeriodBlocks - (current % spendPeriodBlocks);
        setTimeRemaining(remainingBlocks);
      } catch (error) {
        console.error("Error updating time:", error);
      }
    };

    void updateTime();
    const interval = setInterval(updateTime, 12000); // Update every 12 seconds

    return () => clearInterval(interval);
  }, [api]);

  if (timeRemaining === null || currentBlock === null || spendPeriod === null) {
    return null;
  }

  return <> ({formatTimeLeft(timeRemaining, t)} until funding)</>;
}

interface BountyNextActionProps {
  status: string;
  curator?: string;
  updateDue?: bigint;
  unlockAt?: bigint;
  bestNumber?: bigint;
}

export function BountyNextAction({
  status,
  curator: _curator,
  updateDue,
  unlockAt,
  bestNumber,
}: BountyNextActionProps) {
  const { t } = useTranslation();

  const getNextAction = () => {
    if (!status) return null;

    switch (status) {
      case "Proposed":
        return {
          message: t("governance.bounty_next_action_proposed"),
          intent: Intent.PRIMARY,
        };
      case "Approved":
        return {
          message: (
            <Fragment>
              {t("governance.bounty_next_action_approved")}
              <TimeUntilFunding />
            </Fragment>
          ),
          intent: Intent.SUCCESS,
        };
      case "Funded":
        return {
          message: t("governance.bounty_next_action_funded"),
          intent: Intent.PRIMARY,
        };
      case "CuratorProposed":
        return {
          message: t("governance.bounty_next_action_curator_proposed"),
          intent: Intent.WARNING,
        };
      case "Active":
        if (updateDue && bestNumber && updateDue < bestNumber) {
          return {
            message: t("governance.bounty_next_action_update_overdue"),
            intent: Intent.DANGER,
          };
        }
        return {
          message: t("governance.bounty_next_action_active"),
          intent: Intent.PRIMARY,
        };
      case "PendingPayout":
        if (unlockAt && bestNumber && unlockAt < bestNumber) {
          return {
            message: t("governance.bounty_next_action_claim_payout"),
            intent: Intent.SUCCESS,
          };
        }
        return {
          message: t("governance.bounty_next_action_pending_payout"),
          intent: Intent.PRIMARY,
        };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();
  if (!nextAction) return null;

  return <Tag intent={nextAction.intent}>{nextAction.message}</Tag>;
}
