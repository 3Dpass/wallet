import { Intent } from "@blueprintjs/core";

interface CircularProgressProps {
	value: number; // 0 to 1
	size?: number;
	strokeWidth?: number;
	intent?: Intent;
}

export function CircularProgress({
	value,
	size = 16,
	strokeWidth = 2,
	intent = Intent.PRIMARY,
}: CircularProgressProps) {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const offset = circumference - value * circumference;

	const getIntentColor = (intent: Intent) => {
		switch (intent) {
			case Intent.PRIMARY:
				return "var(--blue-500, #106ba3)";
			case Intent.SUCCESS:
				return "var(--green-500, #0d8050)";
			case Intent.WARNING:
				return "var(--orange-500, #bf7326)";
			case Intent.DANGER:
				return "var(--red-500, #c23030)";
			default:
				return "var(--blue-500, #106ba3)";
		}
	};

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			className="transform -rotate-90"
			aria-label={`Progress: ${Math.round(value * 100)}%`}
		>
			<title>Progress: {Math.round(value * 100)}%</title>
			{/* Background circle */}
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				stroke="currentColor"
				strokeWidth={strokeWidth}
				className="text-gray-200 dark:text-gray-700"
			/>
			{/* Progress circle */}
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				stroke={getIntentColor(intent)}
				strokeWidth={strokeWidth}
				strokeDasharray={circumference}
				strokeDashoffset={offset}
				strokeLinecap="round"
				style={{ transition: "stroke-dashoffset 0.2s ease" }}
			/>
		</svg>
	);
}
