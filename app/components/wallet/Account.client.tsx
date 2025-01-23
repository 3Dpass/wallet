import {
	Icon,
	IconSize,
	Spinner,
	SpinnerSize,
	Tooltip,
} from "@blueprintjs/core";
import { useTranslation } from "react-i18next";
import { useAccount } from "../../hooks/useAccount";
import { AccountName } from "../common/AccountName";
import { FormattedAmount } from "../common/FormattedAmount";
import TitledValue from "../common/TitledValue";
import { AccountActions } from "./AccountActions";
import AccountAssets from "./AccountAssets";
import { AccountDialogs } from "./AccountDialogs";
import PoolActions from "./PoolActions";
import type { AccountProps } from "./types";

export default function Account({ pair }: AccountProps) {
	const { t } = useTranslation();
	const {
		state,
		dialogs,
		dialogToggle,
		handleCopyAddress,
		handleUnlockFunds,
		handleCreatePool,
		handleSetPoolMode,
		handleAddressDelete,
		poolAlreadyExist,
	} = useAccount(pair);

	const accountLocked: boolean = pair.isLocked && !pair.meta.isInjected;

	return (
		<div className="relative p-4 h-full text-sm rounded-lg shadow-lg border border-gray-600">
			<AccountDialogs
				pair={pair}
				dialogs={dialogs}
				onDialogToggle={dialogToggle}
				onDelete={handleAddressDelete}
				hasIdentity={state.hasIdentity}
				isRegistrar={state.isRegistrar}
			/>
			<div className="pr-12">
				<AccountName address={pair.address} />
			</div>
			<div className="grid gap-1">
				{!state.balances && (
					<Spinner size={SpinnerSize.SMALL} className="my-5" />
				)}
				{state.balances && (
					<>
						<div className="grid grid-cols-3 gap-1 py-2">
							<TitledValue
								title={t("root.lbl_total_balance")}
								fontMono
								fontSmall
								value={
									<FormattedAmount
										value={state.balances.freeBalance.toBigInt()}
									/>
								}
							/>
							<TitledValue
								title={t("root.lbl_transferable")}
								fontMono
								fontSmall
								value={
									<FormattedAmount
										value={state.balances.availableBalance.toBigInt()}
									/>
								}
							/>
							<TitledValue
								title={t("root.lbl_locked")}
								fontMono
								fontSmall
								value={
									<FormattedAmount
										value={state.balances.lockedBalance.toBigInt()}
									/>
								}
							/>
						</div>
						<AccountAssets pair={pair} />
						{accountLocked && (
							<div className="my-2 text-center">
								{t("root.lbl_account_is_password_protected_1")}{" "}
								<Icon icon="lock" />{" "}
								{t("root.lbl_account_is_password_protected_2")}{" "}
								<button
									type="button"
									onClick={() => dialogToggle("unlock")}
									className="text-white underline underline-offset-4 cursor-pointer bg-transparent border-0 p-0"
								>
									{t("root.lbl_account_is_password_protected_3")}
								</button>{" "}
								{t("root.lbl_account_is_password_protected_4")}
							</div>
						)}
						<AccountActions
							pair={pair}
							balances={state.balances}
							accountLocked={accountLocked}
							onSend={() => dialogToggle("send")}
							onSignVerify={() => dialogToggle("sign_verify")}
							onUnlockFunds={handleUnlockFunds}
							onLockFunds={() => dialogToggle("lock_funds")}
							onDelete={() => dialogToggle("delete")}
							onIdentity={() => dialogToggle("identity")}
							isRegistrar={state.isRegistrar}
							hasIdentity={state.hasIdentity}
						/>
						<PoolActions
							pair={pair}
							poolAlreadyExist={poolAlreadyExist}
							accountLocked={accountLocked}
							isCreatePoolLoading={state.isCreatePoolLoading}
							onCreatePool={handleCreatePool}
							onSetPoolMode={handleSetPoolMode}
							onDialogToggle={dialogToggle}
						/>
					</>
				)}
			</div>
			<div className="absolute top-4 right-4 flex items-center gap-2">
				{Boolean(pair.meta.isInjected) && (
					<Tooltip
						position="bottom"
						content={
							<div>
								{pair.meta.name && (
									<div className="font-bold">{pair.meta.name as string}</div>
								)}
								<div>{t("commons.lbl_loaded_from_extension")}</div>
							</div>
						}
					>
						<Icon icon="intersection" size={14} className="opacity-50" />
					</Tooltip>
				)}
				<Icon
					icon="duplicate"
					size={14}
					className="opacity-50 hover:opacity-100 cursor-pointer"
					onClick={handleCopyAddress}
					title={t("commons.lbl_btn_copy")}
				/>
			</div>
		</div>
	);
}
