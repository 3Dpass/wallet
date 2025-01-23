import { Button, Classes, Icon, IconSize, MenuItem } from "@blueprintjs/core";
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
	onCopyAddress: () => void;
	isRegistrar: boolean;
	hasIdentity: boolean;
	asMenuItems?: boolean;
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
	onCopyAddress,
	isRegistrar,
	hasIdentity,
	asMenuItems,
}: AccountActionsProps) {
	const { t } = useTranslation();

	if (asMenuItems) {
		return (
			<>
				<MenuItem
					icon="duplicate"
					text={t("commons.lbl_btn_copy")}
					onClick={onCopyAddress}
				/>
				<MenuItem
					icon="endorsed"
					text={t("root.lbl_btn_sign_verify")}
					onClick={onSignVerify}
					disabled={accountLocked}
				/>
				<MenuItem
					icon="unlock"
					text={t("root.lbl_btn_unlock")}
					onClick={onUnlockFunds}
					disabled={balances?.lockedBalance.toBigInt() <= 0 || accountLocked}
				/>
				<MenuItem
					icon="lock"
					text={t("root.lbl_btn_lock")}
					onClick={onLockFunds}
					disabled={accountLocked}
				/>
				{!pair.meta.isInjected && (
					<MenuItem
						icon="trash"
						text={t("root.lbl_btn_remove")}
						intent="danger"
						onClick={onDelete}
					/>
				)}
				{!accountLocked && (
					<MenuItem
						icon={hasIdentity ? "endorsed" : "id-number"}
						text={
							isRegistrar
								? t("root.lbl_judgements_requests")
								: t("root.lbl_identity")
						}
						onClick={onIdentity}
					/>
				)}
			</>
		);
	}

	return (
		<div className="grid grid-cols-3 gap-1">
			<Button
				className="text-xs"
				icon="duplicate"
				text={t("commons.lbl_btn_copy")}
				onClick={onCopyAddress}
			/>
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
