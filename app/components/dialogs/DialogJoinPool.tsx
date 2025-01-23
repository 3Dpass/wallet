import { Button, Classes, Dialog, Intent, Tag } from "@blueprintjs/core";
import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useToaster from "../../hooks/useToaster";
import type { IPool } from "../../utils/pool";
import { convertPool } from "../../utils/pool";
import { signAndSend } from "../../utils/sign";
import { useApi } from "../Api";
import { AddressSelect } from "../governance/AddressSelect";

type IProps = {
	pair: KeyringPair;
	isOpen: boolean;
	onClose: () => void;
};

type IPoolData = {
	pools: IPool[];
	poolToJoin: string;
};

export default function DialogJoinPool({ isOpen, onClose, pair }: IProps) {
	const { t } = useTranslation();
	const api = useApi();
	const toaster = useToaster();
	const [canSubmit, setCanSubmit] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const dataInitial: IPoolData = {
		pools: [],
		poolToJoin: "",
	};
	const [data, setData] = useState(dataInitial);

	async function loadPools(api: ApiPromise) {
		const pools = Array.from(await api.query.miningPool.pools.entries());
		const poolsConverted = convertPool(pools);
		const sortedPools = [...poolsConverted.pools].sort(
			(a, b) => (b.poolMembers?.length || 0) - (a.poolMembers?.length || 0),
		);
		setData((prev) => ({
			...prev,
			pools: sortedPools,
			poolToJoin: sortedPools.length > 0 ? sortedPools[0].poolId : "",
		}));
	}

	function handleOnOpening() {
		setIsLoading(false);
		setData(dataInitial);
		if (api) {
			void loadPools(api);
		}
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
			const tx = api.tx.miningPool.addMemberSelf(data.poolToJoin);
			await signAndSend(tx, pair, {}, (status) => {
				if (status.isInBlock) {
					toaster.show({
						icon: "endorsed",
						intent: Intent.SUCCESS,
						message: t("messages.lbl_joined_pool"),
					});
					setIsLoading(false);
					onClose();
				}
			});
		} catch (e: unknown) {
			toaster.show({
				icon: "error",
				intent: Intent.DANGER,
				message: e instanceof Error ? e.message : "Unknown error",
			});
			setIsLoading(false);
		}
	}

	function handlePoolSelect(poolId: string | null) {
		setData((prev) => ({ ...prev, poolToJoin: poolId || "" }));
	}

	return (
		<Dialog
			isOpen={isOpen}
			usePortal
			onOpening={handleOnOpening}
			title={t("dlg_join_pool.lbl_title")}
			onClose={onClose}
			className="w-[90%] sm:w-[640px]"
		>
			<div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
				<AddressSelect
					onAddressChange={handlePoolSelect}
					selectedAddress={data.poolToJoin}
					addresses={data.pools.map((pool) => pool.poolId)}
					isLoading={isLoading}
					metadata={Object.fromEntries(
						data.pools.map((pool) => [
							pool.poolId,
							<Tag key={pool.poolId} minimal round icon="people">
								{pool.poolMembers?.length || 0} {t("commons.lbl_members")}
							</Tag>,
						]),
					)}
				/>
			</div>
			{data.poolToJoin && (
				<div className="font-mono px-4 text-gray-400">
					$ pass3d-pool run --pool-id {data.poolToJoin} ...
				</div>
			)}
			<div className={Classes.DIALOG_FOOTER}>
				<div className={Classes.DIALOG_FOOTER_ACTIONS}>
					<Button
						onClick={onClose}
						text={t("commons.lbl_btn_cancel")}
						disabled={isLoading}
					/>
					<Button
						intent={Intent.PRIMARY}
						disabled={isLoading || !canSubmit || !data.poolToJoin}
						onClick={handleSubmitClick}
						icon="add"
						loading={isLoading}
						text={t("dlg_join_pool.lbl_btn_join_pool")}
					/>
				</div>
			</div>
		</Dialog>
	);
}
