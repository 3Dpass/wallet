import { Button, Classes, Dialog, Intent } from "@blueprintjs/core";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useEffect, useState } from "react";

import type { SignerOptions } from "@polkadot/api/types";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import { signAndSend } from "../../utils/sign";
import { useApi } from "../Api";
import AmountInput from "../common/AmountInput";

type IProps = {
	pair: KeyringPair;
	isOpen: boolean;
	onClose: () => void;
};

export default function DialogSetPoolInterest({
	isOpen,
	onClose,
	pair,
}: IProps) {
	const { t } = useTranslation();
	const api = useApi();
	const toaster = useToaster();
	const [canSubmit, setCanSubmit] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const dataInitial = {
		interest: 0,
	};
	const [data, setData] = useState(dataInitial);

	function handleOnOpening() {
		setIsLoading(false);
		setData(dataInitial);
	}

	useEffect(() => {
		setCanSubmit(api !== undefined);
	}, [api]);

	function handleInterestChange(valueAsNumber: number) {
		setData((prev) => ({ ...prev, interest: valueAsNumber }));
	}

	async function handleSubmitClick() {
		if (!api) {
			return;
		}
		const isLocked = pair.isLocked && !pair.meta.isInjected;
		if (isLocked) {
			toaster.show({
				icon: "error",
				intent: Intent.DANGER,
				message: t("messages.lbl_account_locked"),
			});
			return;
		}
		setIsLoading(true);
		try {
			const tx = api.tx.miningPool.setPoolInterest(data.interest);
			const options: Partial<SignerOptions> = {};
			await signAndSend(tx, pair, options);
			toaster.show({
				icon: "endorsed",
				intent: Intent.SUCCESS,
				message: t("messages.lbl_interest_set"),
			});
		} catch (e: unknown) {
			toaster.show({
				icon: "error",
				intent: Intent.DANGER,
				message: e instanceof Error ? e.message : "Unknown error",
			});
		} finally {
			setIsLoading(false);
			onClose();
		}
	}

	return (
		<Dialog
			isOpen={isOpen}
			usePortal
			onOpening={handleOnOpening}
			title={t("dlg_pool_interest.lbl_title")}
			onClose={onClose}
			className="w-[90%] sm:w-[640px]"
		>
			<div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
				<AmountInput
					disabled={isLoading}
					onValueChange={handleInterestChange}
					placeholder={t("dlg_pool_interest.lbl_pool_interest")}
				/>
			</div>
			<div className={Classes.DIALOG_FOOTER}>
				<div className={Classes.DIALOG_FOOTER_ACTIONS}>
					<Button
						onClick={onClose}
						text={t("commons.lbl_btn_cancel")}
						disabled={isLoading}
					/>
					<Button
						intent={Intent.PRIMARY}
						disabled={isLoading || !canSubmit}
						onClick={handleSubmitClick}
						icon="arrow-right"
						loading={isLoading}
						text={t("dlg_pool_interest.lbl_btn_set_interest")}
					/>
				</div>
			</div>
		</Dialog>
	);
}
