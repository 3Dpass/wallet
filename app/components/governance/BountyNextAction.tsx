import { Tag, Intent } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";

interface BountyNextActionProps {
  status: string;
  curator?: string;
  updateDue?: bigint;
  unlockAt?: bigint;
  bestNumber?: bigint;
}

export function BountyNextAction({ status, curator, updateDue, unlockAt, bestNumber }: BountyNextActionProps) {
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
          message: t("governance.bounty_next_action_approved"),
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
