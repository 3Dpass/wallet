import { Intent } from "@blueprintjs/core";
import type { KeyringPair } from "@polkadot/keyring/types";
import keyring from "@polkadot/ui-keyring";
import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { poolIdsAtom } from "../atoms";
import { useApi } from "../components/Api";
import type {
	AccountDialogs,
	AccountState,
	RegistrarInfo,
} from "../components/wallet/types";
import { signAndSend } from "../utils/sign";
import useToaster from "./useToaster";

interface IdentityInfo {
	judgements?: [number, { toString: () => string }][];
}

export function useAccount(pair: KeyringPair) {
	const { t } = useTranslation();
	const api = useApi();
	const toaster = useToaster();
	const [poolIds, setPoolIds] = useAtom(poolIdsAtom);
	const poolAlreadyExist = poolIds.includes(pair.address);

	const [state, setState] = useState<AccountState>({
		balances: undefined,
		hasIdentity: false,
		isRegistrar: false,
		isCreatePoolLoading: false,
	});

	const dialogsInitial: AccountDialogs = {
		send: false,
		delete: false,
		unlock: false,
		lock_funds: false,
		sign_verify: false,
		create_pool: false,
		set_pool_interest: false,
		set_pool_difficulty: false,
		join_pool: false,
		leave_pool: false,
		close_pool: false,
		identity: false,
		add_miner: false,
		remove_miner: false,
	};

	const [dialogs, setDialogs] = useState(dialogsInitial);

	const dialogToggle = useCallback((name: keyof typeof dialogsInitial) => {
		setDialogs((prev) => ({ ...prev, [name]: !prev[name] }));
	}, []);

	const showError = useCallback(
		(message: string) => {
			toaster.show({
				icon: "error",
				intent: Intent.DANGER,
				message,
			});
		},
		[toaster],
	);

	const handleCopyAddress = useCallback(async () => {
		await navigator.clipboard.writeText(pair.address);
		toaster.show({
			icon: "tick",
			intent: Intent.SUCCESS,
			message: t("messages.lbl_address_copied"),
		});
	}, [pair.address, t, toaster]);

	const handleUnlockFunds = useCallback(async () => {
		if (!api) return;
		try {
			const tx = api.tx.rewards.unlock();
			await signAndSend(tx, pair);
			toaster.show({
				icon: "tick",
				intent: Intent.SUCCESS,
				message: t("messages.lbl_unlock_request_sent"),
			});
		} catch (e) {
			showError(String(e));
		}
	}, [api, pair, showError, t, toaster]);

	const handleCreatePool = useCallback(async () => {
		if (!api) return;
		const isLocked = pair.isLocked && !pair.meta.isInjected;
		if (isLocked) {
			showError(t("messages.lbl_account_locked"));
			return;
		}
		setState((prev) => ({ ...prev, isCreatePoolLoading: true }));
		try {
			const tx = api.tx.miningPool.createPool();
			const unsub = await signAndSend(
				tx,
				pair,
				{},
				({ status, dispatchError }) => {
					if (!status.isInBlock && !status.isFinalized) return;
					setState((prev) => ({ ...prev, isCreatePoolLoading: false }));
					unsub();
					if (dispatchError) {
						if (dispatchError.isModule) {
							const decoded = api.registry.findMetaError(
								dispatchError.asModule,
							);
							const { docs, name, section } = decoded;
							showError(`${section}.${name}: ${docs.join(" ")}`);
						} else {
							showError(dispatchError.toString());
						}
						setState((prev) => ({ ...prev, isCreatePoolLoading: false }));
						return;
					}
					toaster.show({
						icon: "endorsed",
						intent: Intent.SUCCESS,
						message: t("messages.lbl_mining_pool_created"),
					});
					setPoolIds([pair.address, ...poolIds]);
				},
			);
			toaster.show({
				icon: "time",
				intent: Intent.PRIMARY,
				message: t("messages.lbl_creating_mining_pool"),
			});
		} catch (e) {
			setState((prev) => ({ ...prev, isCreatePoolLoading: false }));
			showError(String(e));
		}
	}, [api, pair, poolIds, setPoolIds, showError, t, toaster]);

	const handleSetPoolMode = useCallback(
		async (newMode: boolean) => {
			if (!api) return;
			try {
				const tx = api.tx.miningPool.setPoolMode(newMode);
				await signAndSend(tx, pair, {});
				toaster.show({
					icon: "endorsed",
					intent: Intent.SUCCESS,
					message: t("messages.lbl_kyc_changed"),
				});
			} catch (e) {
				showError(String(e));
			}
		},
		[api, pair, showError, t, toaster],
	);

	const handleAddressDelete = useCallback(() => {
		keyring.forgetAccount(pair.address);
		dialogToggle("delete");
	}, [dialogToggle, pair]);

	useEffect(() => {
		if (!api) return;

		setState((prev) => ({ ...prev, balances: undefined }));

		api.derive.balances.all(pair.address).then((balances) => {
			try {
				pair.unlock();
			} catch {
				// pair is password protected
			}
			setState((prev) => ({ ...prev, balances }));
		});

		api.query.identity.identityOf(pair.address).then((identityInfo) => {
			if (identityInfo) {
				const identity = (identityInfo.toHuman() || {}) as IdentityInfo;
				if (identity?.judgements) {
					let hasIdentity = false;
					for (const [, judgement] of identity.judgements) {
						if (judgement.toString() === "Reasonable") {
							hasIdentity = true;
							break;
						}
					}
					setState((prev) => ({ ...prev, hasIdentity }));
				}
			}
		});

		api.query.identity.registrars().then((registrarsData) => {
			const registrars = registrarsData.toHuman() as RegistrarInfo[];
			if (registrars && Array.isArray(registrars)) {
				for (const registrar of registrars) {
					if (registrar?.account === pair.address) {
						setState((prev) => ({ ...prev, isRegistrar: true }));
						break;
					}
				}
			}
		});
	}, [api, pair]);

	return {
		state,
		dialogs,
		dialogToggle,
		handleCopyAddress,
		handleUnlockFunds,
		handleCreatePool,
		handleSetPoolMode,
		handleAddressDelete,
		poolAlreadyExist,
	};
}
