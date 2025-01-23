import type { DeriveBalancesAll } from "@polkadot/api-derive/types";
import type { KeyringPair } from "@polkadot/keyring/types";

export type AccountProps = {
	pair: KeyringPair;
};

export type AccountDialogs = {
	send: boolean;
	delete: boolean;
	unlock: boolean;
	lock_funds: boolean;
	sign_verify: boolean;
	create_pool: boolean;
	set_pool_interest: boolean;
	set_pool_difficulty: boolean;
	join_pool: boolean;
	leave_pool: boolean;
	close_pool: boolean;
	identity: boolean;
	add_miner: boolean;
	remove_miner: boolean;
};

export type AccountState = {
	balances?: DeriveBalancesAll;
	hasIdentity: boolean;
	isRegistrar: boolean;
	isCreatePoolLoading: boolean;
};

export type RegistrarInfo = {
	account: string;
};
