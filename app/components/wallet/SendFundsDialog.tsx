import type { KeyringPair } from "@polkadot/keyring/types";
import { Dialog } from "@polkadot/react-components";
import { useTranslation } from "react-i18next";

type SendFundsDialogProps = {
	isOpen: boolean;
	onClose: () => void;
	sender: KeyringPair;
	assetId?: string;
	assetMetadata?: {
		decimals: string;
		symbol: string;
	};
};

export function SendFundsDialog({
	isOpen,
	onClose,
	sender,
	assetId,
	assetMetadata,
}: SendFundsDialogProps) {
	const { t } = useTranslation();

	return (
		<Dialog
			isOpen={isOpen}
			onClose={onClose}
			title={t("root.dlg_send_funds_title", {
				unit: assetMetadata?.symbol || "P3D",
			})}
		>
			{/* ... rest of the dialog content using assetMetadata for units ... */}
		</Dialog>
	);
}
