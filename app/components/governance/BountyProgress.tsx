import { useTranslation } from "react-i18next";

interface BountyStep {
	label: string;
	status: "complete" | "current" | "upcoming";
}

export function BountyProgress({ currentStatus }: { currentStatus: string }) {
	const { t } = useTranslation();

	// Define the order of statuses in the lifecycle
	const statusOrder = {
		Proposed: 0,
		Approved: 1,
		Funded: 2,
		CuratorProposed: 3,
		Active: 4,
		PendingPayout: 5,
	};

	// Get the current status index
	const currentIndex =
		statusOrder[currentStatus as keyof typeof statusOrder] || 0;

	const steps: BountyStep[] = [
		{
			label: t("governance.bounty_step_proposed"),
			status:
				currentIndex === 0
					? "current"
					: currentIndex > 0
						? "complete"
						: "upcoming",
		},
		{
			label: t("governance.bounty_step_approved"),
			status:
				currentIndex === 1
					? "current"
					: currentIndex > 1
						? "complete"
						: "upcoming",
		},
		{
			label: t("governance.bounty_step_funded"),
			status:
				currentIndex === 2
					? "current"
					: currentIndex > 2
						? "complete"
						: "upcoming",
		},
		{
			label: t("governance.bounty_step_curator_proposed"),
			status:
				currentIndex === 3
					? "current"
					: currentIndex > 3
						? "complete"
						: "upcoming",
		},
		{
			label: t("governance.bounty_step_active"),
			status:
				currentIndex === 4
					? "current"
					: currentIndex > 4
						? "complete"
						: "upcoming",
		},
		{
			label: t("governance.bounty_step_payout"),
			status:
				currentIndex === 5
					? "current"
					: currentIndex > 5
						? "complete"
						: "upcoming",
		},
	];

	return (
		<div className="flex items-center w-full my-4 relative">
			<div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-200 dark:bg-gray-700" />
			{steps.map((step, index) => (
				<div
					key={step.label}
					className="relative flex-1 flex flex-col items-center"
				>
					<div
						className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10
              ${
								step.status === "complete"
									? "bg-green-500 text-white"
									: step.status === "current"
										? "bg-blue-500 text-white"
										: "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
							}`}
					>
						{step.status === "complete" ? (
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
								<title>Completed Step</title>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
						) : (
							<span className="text-sm">{index + 1}</span>
						)}
					</div>
					<div className="text-xs mt-2 text-center text-gray-600 dark:text-gray-400">
						{step.label}
					</div>
				</div>
			))}
		</div>
	);
}
