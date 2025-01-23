import { Button, Spinner, SpinnerSize } from "@blueprintjs/core";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { Codec } from "@polkadot/types/types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../Api";
import { FormattedAmount } from "../common/FormattedAmount";
import TitledValue from "../common/TitledValue";

type AssetBalance = {
	assetId: string;
	balance: bigint;
	metadata?: {
		decimals: string;
		symbol: string;
	};
};

type IProps = {
	pair: KeyringPair;
	onSend?: (asset?: {
		id: string;
		metadata?: {
			decimals: string;
			symbol: string;
		};
	}) => void;
};

export default function AccountAssets({ pair, onSend }: IProps) {
	const { t } = useTranslation();
	const api = useApi();
	const [assets, setAssets] = useState<AssetBalance[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function fetchAssets() {
			if (!api || !pair.address) {
				return;
			}

			try {
				// Get all asset IDs
				const assetEntries = await api.query.poscanAssets.asset.entries();
				const assetIds = assetEntries.map(([key]) => key.args[0].toString());

				// Fetch balances and metadata for each asset
				const assetBalances = await Promise.all(
					assetIds.map(async (assetId) => {
						const [balance, metadata] = await Promise.all([
							api.query.poscanAssets.account(assetId, pair.address),
							api.query.poscanAssets.metadata(assetId),
						]);

						// Extract the balance value from the complex object
						const balanceData = balance.toJSON() as { balance: number };
						const balanceValue = balanceData?.balance || 0;
						const metadataHuman = metadata.toHuman() as {
							decimals: string;
							symbol: string;
						};

						return {
							assetId,
							balance: BigInt(balanceValue),
							metadata: metadataHuman,
						};
					}),
				);

				// Filter out zero balances
				const nonZeroBalances = assetBalances.filter(
					(asset) => asset.balance > BigInt(0),
				);
				setAssets(nonZeroBalances);
			} catch (error) {
				console.error("Error fetching assets:", error);
			} finally {
				setIsLoading(false);
			}
		}

		fetchAssets();
	}, [api, pair.address]);

	if (isLoading) {
		return <Spinner size={SpinnerSize.SMALL} className="my-5" />;
	}

	if (assets.length === 0) {
		return null;
	}

	return (
		<TitledValue
			title="Tokens"
			fontMono
			value={
				<div className="grid grid-cols-3 gap-1">
					{assets.map((asset) => (
						<div key={asset.assetId}>
							<Button
								minimal
								small
								className="p-0 h-auto font-mono"
								onClick={() =>
									onSend?.({
										id: asset.assetId,
										metadata: asset.metadata,
									})
								}
							>
								<FormattedAmount
									value={asset.balance}
									decimals={
										asset.metadata
											? Number.parseInt(asset.metadata.decimals)
											: 0
									}
									unit={asset.metadata?.symbol}
								/>
							</Button>
						</div>
					))}
				</div>
			}
		/>
	);
}
