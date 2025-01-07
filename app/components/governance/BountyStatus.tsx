import { Tag, Intent } from "@blueprintjs/core";

interface BountyStatusProps {
  status: string;
}

export function BountyStatus({ status }: BountyStatusProps) {
  const getStatusIntent = (status: string) => {
    switch (status) {
      case "Active":
        return Intent.PRIMARY;
      case "PendingPayout":
        return Intent.PRIMARY;
      case "Proposed":
        return Intent.NONE;
      case "Approved":
        return Intent.SUCCESS;
      case "CuratorProposed":
        return Intent.WARNING;
      case "Funded":
        return Intent.PRIMARY;
      default:
        return Intent.NONE;
    }
  };

  return <Tag intent={getStatusIntent(status)}>{status}</Tag>;
}
