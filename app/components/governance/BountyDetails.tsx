import { H4, HTMLTable, Intent, Spinner, Tag } from "@blueprintjs/core";
import type { DeriveCollectiveProposal } from "@polkadot/api-derive/types";
import type { Bytes, Option } from "@polkadot/types";
import type { Bounty, BountyStatus } from "@polkadot/types/interfaces";
import { hexToString } from "@polkadot/util";
import { useApi } from "app/components/Api";
import { AccountName } from "app/components/common/AccountName";
import { FormattedAmount } from "app/components/common/FormattedAmount";
import { mockBounties } from "app/utils/mock";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BountyNextAction } from "./BountyNextAction";
import { BountyProgress } from "./BountyProgress";

interface MockBountyData {
	proposer: { toString: () => string };
	value: { toBigInt: () => bigint };
	fee?: { toBigInt: () => bigint | undefined };
	curator?: { toString: () => string | undefined };
	status: {
		type: string;
		asActive?: {
			curator: { toString: () => string | undefined };
			updateDue: { toBigInt: () => bigint };
		};
		asPendingPayout?: {
			curator: { toString: () => string | undefined };
			unlockAt: { toBigInt: () => bigint };
		};
		asCuratorProposed?: {
			curator: { toString: () => string | undefined };
		};
	};
}

interface BountyDetailsProps {
	bountyId: string;
	motion: DeriveCollectiveProposal;
	type: "approval" | "curator" | "close";
	curator?: string;
	fee?: bigint;
	showHeader?: boolean;
}

export function BountyDetails({
	bountyId,
	motion,
	type,
	curator,
	fee,
	showHeader = true,
}: BountyDetailsProps) {
	const { t } = useTranslation();
	const api = useApi();
	const [bountyData, setBountyData] = useState<Bounty | MockBountyData | null>(
		null,
	);
	const [description, setDescription] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [bestNumber, setBestNumber] = useState<bigint | undefined>(undefined);
	const isMockMode =
		process.env.NODE_ENV === "development" && mockBounties.size > 0;

	useEffect(() => {
		if (!api) return;

		const loadBounty = async () => {
			try {
				if (isMockMode) {
					const mockBounty = mockBounties.get(bountyId);
					if (mockBounty) {
						const mockBountyData = {
							proposer: { toString: () => mockBounty.proposer },
							value: { toBigInt: () => mockBounty.value },
							fee: mockBounty.fee
								? { toBigInt: () => mockBounty.fee }
								: undefined,
							curator: mockBounty.curator
								? { toString: () => mockBounty.curator }
								: undefined,
							status: {
								type: mockBounty.status,
								...(mockBounty.status === "Active" && {
									asActive: {
										curator: { toString: () => mockBounty.curator },
										updateDue: { toBigInt: () => BigInt(1000) },
									},
								}),
								...(mockBounty.status === "PendingPayout" && {
									asPendingPayout: {
										curator: { toString: () => mockBounty.curator },
										unlockAt: { toBigInt: () => BigInt(2000) },
									},
								}),
								...(mockBounty.status === "CuratorProposed" && {
									asCuratorProposed: {
										curator: { toString: () => mockBounty.curator },
									},
								}),
							},
						};
						setBountyData(mockBountyData);
						setDescription(mockBounty.description);
					} else {
						setBountyData(null);
					}
				} else {
					const bountyInfo = (await api.query.bounties.bounties(
						bountyId,
					)) as Option<Bounty>;
					const unwrapped = bountyInfo.unwrapOr(null);

					// Fetch description from bounty description storage
					const descriptionHash = (await api.query.bounties.bountyDescriptions(
						bountyId,
					)) as Option<Bytes>;
					if (descriptionHash.isSome) {
						const rawDescription = descriptionHash.unwrap();
						try {
							const decodedDescription = hexToString(rawDescription.toHex());
							setDescription(decodedDescription);
						} catch (error) {
							console.error("Failed to decode description:", error);
							setDescription(rawDescription.toString());
						}
					}

					setBountyData(unwrapped);
				}
			} catch (error) {
				console.error("Failed to load bounty:", error);
			} finally {
				setLoading(false);
			}
		};

		loadBounty();

		// Subscribe to best number updates
		let unsubscribe: (() => void) | undefined;
		api.derive.chain
			.bestNumber((number) => {
				setBestNumber(number.toBigInt());
			})
			.then((unsub) => {
				unsubscribe = unsub;
			});

		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	}, [api, bountyId, isMockMode]);

	const title = {
		approval: "Approve Bounty",
		curator: "Propose Curator for Bounty",
		close: "Close Bounty",
	}[type];

	if (loading) {
		return (
			<div>
				<H4>
					{title} #{bountyId}
				</H4>
				<div className="flex items-center gap-2 mt-2">
					<Spinner size={16} /> {t("common.loading")}
				</div>
			</div>
		);
	}

	if (!bountyData) {
		return (
			<div>
				<H4>
					{title} #{bountyId}
				</H4>
				<Tag intent={Intent.DANGER} className="mt-2">
					{t("governance.bounty_not_found")}
				</Tag>
			</div>
		);
	}

	return (
		<div className="max-w-4xl w-full">
			{showHeader && (
				<div className="mb-3">
					<H4>
						{title} #{bountyId}
					</H4>
				</div>
			)}
			{bountyData?.status && (
				<BountyProgress currentStatus={bountyData.status.type} />
			)}
			<HTMLTable striped className="w-full">
				<tbody>
					{bountyData?.status && (
						<tr>
							<td className="text-gray-500 whitespace-nowrap pr-8 w-0">
								{t("governance.next_step")}
							</td>
							<td className="flex gap-2 items-center">
								<BountyNextAction
									status={bountyData.status.type}
									updateDue={
										bountyData.status.type === "Active"
											? bountyData.status.asActive?.updateDue?.toBigInt()
											: undefined
									}
									unlockAt={
										bountyData.status.type === "PendingPayout"
											? bountyData.status.asPendingPayout?.unlockAt?.toBigInt()
											: undefined
									}
									bestNumber={bestNumber}
								/>
							</td>
						</tr>
					)}
					{bountyData?.status &&
						((bountyData.status.type === "CuratorProposed" &&
							bountyData.status.asCuratorProposed?.curator) ||
							(bountyData.status.type === "Active" &&
								bountyData.status.asActive?.curator) ||
							(bountyData.status.type === "PendingPayout" &&
								bountyData.status.asPendingPayout?.curator)) && (
							<tr>
								<td className="text-gray-500 whitespace-nowrap pr-8 w-0">
									{t("governance.curator")}
								</td>
								<td>
									<AccountName
										address={(
											(bountyData.status.type === "CuratorProposed" &&
												bountyData.status.asCuratorProposed?.curator) ||
											(bountyData.status.type === "Active" &&
												bountyData.status.asActive?.curator) ||
											(bountyData.status.type === "PendingPayout" &&
												bountyData.status.asPendingPayout?.curator)
										).toString()}
									/>
								</td>
							</tr>
						)}
					{description && (
						<tr>
							<td className="text-gray-500 whitespace-nowrap pr-8 w-0">
								{t("governance.description")}
							</td>
							<td>{description}</td>
						</tr>
					)}
					{type === "curator" && curator && (
						<tr>
							<td className="text-gray-500 whitespace-nowrap pr-8 w-0">
								{t("governance.curator")}
							</td>
							<td>
								<AccountName address={curator} />
							</td>
						</tr>
					)}
					{type === "curator" && fee !== undefined && fee !== BigInt(0) && (
						<tr>
							<td className="text-gray-500 whitespace-nowrap pr-8 w-0">
								{t("governance.curator_fee")}
							</td>
							<td>
								<FormattedAmount value={fee} />
							</td>
						</tr>
					)}
					<tr>
						<td className="text-gray-500 whitespace-nowrap pr-8 w-0">
							{type === "approval"
								? t("governance.value")
								: t("governance.bounty_value")}
						</td>
						<td>
							<FormattedAmount value={bountyData.value.toBigInt()} />
						</td>
					</tr>
					{bountyData.fee &&
						type === "approval" &&
						bountyData.fee.toBigInt() !== BigInt(0) && (
							<tr>
								<td className="text-gray-500 whitespace-nowrap pr-8 w-0">
									{t("governance.fee")}
								</td>
								<td>
									<FormattedAmount value={bountyData.fee?.toBigInt() ?? 0} />
								</td>
							</tr>
						)}
					{bountyData.proposer && (
						<tr>
							<td className="text-gray-500 whitespace-nowrap pr-8 w-0">
								{t("governance.proposer")}
							</td>
							<td>
								<AccountName address={bountyData.proposer.toString()} />
							</td>
						</tr>
					)}
				</tbody>
			</HTMLTable>
		</div>
	);
}
