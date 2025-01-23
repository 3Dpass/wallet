import { Button, Classes, Icon, IconSize } from "@blueprintjs/core";
import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useTranslation } from "react-i18next";

type AccountActionsProps = {
	pair: KeyringPair;
	balances: DeriveBalancesAll;
	accountLocked: boolean;
	onSignVerify: () => void;
	onUnlockFunds: () => void;
	onLockFunds: () => void;
	onDelete: () => void;
	onIdentity: () => void;
	isRegistrar: boolean;
	hasIdentity: boolean;
};

export function AccountActions({
	pair,
	balances,
	accountLocked,
	onSignVerify,
	onUnlockFunds,
	onLockFunds,
	onDelete,
	onIdentity,
	isRegistrar,
	hasIdentity,
}: AccountActionsProps) {
	const { t } = useTranslation();

	return (
		<div className="grid grid-cols-3 gap-1">
			<Button
				className="text-xs"
				icon="endorsed"
				text={t("root.lbl_btn_sign_verify")}
				onClick={onSignVerify}
				disabled={accountLocked}
			/>
			<Button
				className="text-xs"
				icon="unlock"
				text={t("root.lbl_btn_unlock")}
				onClick={onUnlockFunds}
				disabled={balances.lockedBalance.toBigInt() <= 0 || accountLocked}
			/>
			<Button
				className="text-xs"
				icon="lock"
				text={t("root.lbl_btn_lock")}
				onClick={onLockFunds}
				disabled={accountLocked}
			/>
			{!pair.meta.isInjected && (
				<Button
					className="text-xs"
					icon="delete"
					text={t("root.lbl_btn_remove")}
					onClick={onDelete}
				/>
			)}
			{!accountLocked && (
				<button
					type="button"
					className="flex min-h-8 items-center justify-center gap-1 cursor-pointer group bg-transparent border-0 p-0"
					onClick={onIdentity}
				>
					{isRegistrar ? (
						<span className="font-bold underline underline-offset-2 text-center text-xs">
							{t("root.lbl_judgements_requests")}&nbsp;&rarr;
						</span>
					) : (
						<>
							<span className="group-hover:underline underline-offset-2 text-xs">
								{t("root.lbl_identity")}:
							</span>
							{hasIdentity ? (
								<Icon
									className={`${Classes.ICON} ${Classes.INTENT_SUCCESS}`}
									icon="endorsed"
									size={IconSize.STANDARD}
								/>
							) : (
								<span className="font-bold underline underline-offset-2 text-xs">
									{t("root.lbl_identity_not_claimed")} &rarr;
								</span>
							)}
						</>
					)}
				</button>
			)}
		</div>
	);
}
