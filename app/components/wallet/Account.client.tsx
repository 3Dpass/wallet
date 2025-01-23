import { Button, Icon, Spinner, SpinnerSize, Tooltip } from "@blueprintjs/core";
import { useState } from "react";
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

type SelectedAsset =
	| {
			id: string;
			metadata?: {
				decimals: string;
				symbol: string;
			};
	  }
	| undefined;

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

	const [selectedAsset, setSelectedAsset] = useState<SelectedAsset>();
	const accountLocked: boolean = pair.isLocked && !pair.meta.isInjected;

	const handleSend = (asset?: SelectedAsset) => {
		setSelectedAsset(asset);
		dialogToggle("send");
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="relative flex flex-col gap-5 p-4 pb-3 h-full text-sm rounded-lg shadow-lg border border-gray-600">
				<AccountDialogs
					pair={pair}
					dialogs={dialogs}
					onDialogToggle={dialogToggle}
					onDelete={handleAddressDelete}
					hasIdentity={state.hasIdentity}
					isRegistrar={state.isRegistrar}
					selectedAsset={selectedAsset}
				/>
				<div className="pr-12">
					<AccountName address={pair.address} />
				</div>
				<div className="grid gap-1">
					{!state.balances && (
						<Spinner size={SpinnerSize.SMALL} className="my-5" />
					)}
					{state.balances && (
						<div className="flex flex-col gap-3">
							<div className="grid grid-cols-3 gap-1">
								<TitledValue
									title={t("root.lbl_total_balance")}
									fontMono
									value={
										<FormattedAmount
											value={state.balances.freeBalance.toBigInt()}
										/>
									}
								/>
								<TitledValue
									title={t("root.lbl_transferable")}
									fontMono
									value={
										<Button
											minimal
											small
											className="p-0 px-1 -mx-1 h-auto font-mono"
											onClick={() => handleSend()}
										>
											<div className="inline-flex items-center justify-start gap-1 text-lg">
												<div>
													<FormattedAmount
														value={state.balances.availableBalance.toBigInt()}
														withUnit={false}
													/>
												</div>
												<Icon icon="send-to" size={10} className="opacity-50" />
											</div>
										</Button>
									}
								/>
								<TitledValue
									title={t("root.lbl_locked")}
									fontMono
									value={
										<FormattedAmount
											value={state.balances.lockedBalance.toBigInt()}
										/>
									}
								/>
							</div>
							<AccountAssets pair={pair} onSend={handleSend} />
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
						</div>
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

			{state.balances && (
				<div className="flex flex-col gap-2">
					<AccountActions
						pair={pair}
						balances={state.balances}
						accountLocked={accountLocked}
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
				</div>
			)}
		</div>
	);
}
