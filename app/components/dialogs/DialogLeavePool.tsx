import { Button, Classes, Dialog, Intent, MenuItem } from "@blueprintjs/core";
import {
	type ItemPredicate,
	type ItemRenderer,
	Select2,
} from "@blueprintjs/select";
import type { KeyringPair } from "@polkadot/keyring/types";
import { type MouseEventHandler, useEffect, useState } from "react";

import type { SignerOptions } from "@polkadot/api/types";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import { type IPool, convertPool, poolsWithMember } from "../../utils/pool";
import { signAndSend } from "../../utils/sign";
import { useApi } from "../Api";

type IProps = {
	pair: KeyringPair;
	isOpen: boolean;
	onClose: () => void;
};

type IPoolData = {
	pools: IPool[];
	poolIds: string[];
	poolToLeave: string;
};

export default function DialogLeavePool({ isOpen, onClose, pair }: IProps) {
	const { t } = useTranslation();
	const api = useApi();
	const toaster = useToaster();
	const [canSubmit, setCanSubmit] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const dataInitial: IPoolData = {
		pools: [],
		poolIds: [],
		poolToLeave: "",
	};
	const [data, setData] = useState(dataInitial);

	async function loadPools() {
		if (!api) {
			return;
		}
		const pools = Array.from(await api.query.miningPool.pools.entries());
		const poolsFiltered = poolsWithMember(convertPool(pools), pair.address);
		setData((prev) => ({
			...prev,
			pools: poolsFiltered.pools,
			poolIds: poolsFiltered.poolIds,
			poolToLeave: poolsFiltered.poolIds[0],
		}));
	}

	function handleOnOpening() {
		setIsLoading(false);
		setData(dataInitial);
		loadPools().then(() => {});
	}

	useEffect(() => {
		setCanSubmit(api !== undefined);
	}, [api]);

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
			const tx = api.tx.miningPool.removeMemberSelf(data.poolToLeave);
			const options: Partial<SignerOptions> = {};
			await signAndSend(tx, pair, options);
			toaster.show({
				icon: "endorsed",
				intent: Intent.SUCCESS,
				message: t("messages.lbl_left_mining_pool"),
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

	function setPool(poolId: string) {
		setData((prev) => ({ ...prev, poolToLeave: poolId }));
	}

	const filterPool: ItemPredicate<string> = (
		query,
		poolId,
		_index,
		exactMatch,
	) => {
		const normalizedId = poolId.toLowerCase();
		const normalizedQuery = query.toLowerCase();
		if (exactMatch) {
			return normalizedId === normalizedQuery;
		}
		return normalizedId.indexOf(normalizedQuery) >= 0;
	};

	const renderPoolId: ItemRenderer<string> = (
		poolId,
		{ handleClick, handleFocus, modifiers, query },
	) => {
		if (!modifiers.matchesPredicate) {
			return null;
		}
		return (
			<MenuItem
				className="font-mono text-lg"
				active={modifiers.active}
				disabled={modifiers.disabled}
				key={poolId}
				text={poolId}
				onClick={handleClick as MouseEventHandler}
				onFocus={handleFocus}
				roleStructure="listoption"
			/>
		);
	};

	return (
		<Dialog
			isOpen={isOpen}
			usePortal
			onOpening={handleOnOpening}
			title={t("dlg_leave_pool.lbl_title")}
			onClose={onClose}
			className="w-[90%] sm:w-[640px]"
		>
			<div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
				<Select2
					items={data.poolIds}
					itemPredicate={filterPool}
					itemRenderer={renderPoolId}
					noResults={
						<MenuItem
							disabled
							text={t("dlg_leave_pool.lbl_no_results")}
							roleStructure="listoption"
						/>
					}
					onItemSelect={setPool}
					popoverProps={{ matchTargetWidth: true }}
					fill
				>
					<Button
						text={data.poolToLeave}
						rightIcon="double-caret-vertical"
						className={`${Classes.CONTEXT_MENU} ${Classes.FILL} font-mono text-lg`}
					/>
				</Select2>
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
						icon="add"
						loading={isLoading}
						text={t("dlg_leave_pool.lbl_btn_leave_pool")}
					/>
				</div>
			</div>
		</Dialog>
	);
}
