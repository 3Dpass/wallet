import { useQuery } from "@apollo/client";
import { Button, Intent, Spinner } from "@blueprintjs/core";
import type { KeyringPair } from "@polkadot/keyring/types";
import { getIdentityJudgementRequests } from "app/utils/events";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { IFormatOptions } from "../../atoms";
import { formatOptionsAtom } from "../../atoms";
import ErrorMessage from "../../components/common/Error";
import useToaster from "../../hooks/useToaster";
import type { EventsData, EventsVars } from "../../queries";
import { GET_EVENTS } from "../../queries";
import { signAndSend } from "../../utils/sign";
import { useApi } from "../Api";
import type { IPalletIdentityRegistrarInfo } from "./UserCard";
import UserCard from "./UserCard";

type IProps = {
	regIndex: number;
	pair: KeyringPair;
	// dateMonthAgo is needed to use it in the GQL request to get events only for 30 days ago
	dateMonthAgo: Date;
	onClose: () => void;
};

type IData = {
	candidateList: IPalletIdentityRegistrarInfo[] | null;
};

export default function CandidateCards({
	regIndex,
	pair,
	dateMonthAgo,
	onClose,
}: IProps) {
	const { t } = useTranslation();
	const api = useApi();
	const toaster = useToaster();
	const [addressLoading, setAddressLoading] = useState("");
	const formatOptions: false | IFormatOptions = useAtomValue(formatOptionsAtom);
	const dataInitial: IData = {
		candidateList: null,
	};
	const [dataState, setData] = useState(dataInitial);
	const queryEvents = useQuery<EventsData, EventsVars>(GET_EVENTS, {
		variables: {
			eventModule: "Identity",
			eventName: "JudgementRequested",
			blockDatetimeGte: dateMonthAgo.toISOString(),
			pageSize: 10000,
		},
	});
	if (queryEvents.data && !dataState.candidateList && api && formatOptions) {
		getIdentityJudgementRequests(
			api,
			formatOptions.chainSS58,
			regIndex,
			queryEvents,
		).then((newCandidateList) => {
			setData((prev) => ({ ...prev, candidateList: newCandidateList }));
		});
	}

	async function handleSubmitAddJudgement(candidateAddress: string) {
		if (!api) {
			return;
		}
		setAddressLoading(candidateAddress);
		try {
			const tx = api.tx.identity.provideJudgement(
				regIndex,
				candidateAddress,
				"Reasonable",
			);
			await signAndSend(tx, pair, {});
			toaster.show({
				icon: "endorsed",
				intent: Intent.SUCCESS,
				message: t("messages.lbl_judgement_sent"),
			});
		} catch (e: unknown) {
			toaster.show({
				icon: "error",
				intent: Intent.DANGER,
				message: e instanceof Error ? e.message : "An error occurred",
			});
		} finally {
			setAddressLoading("");
			onClose();
		}
	}

	if (queryEvents.loading || !dataState.candidateList) return <Spinner />;
	if (queryEvents.error)
		return (
			<ErrorMessage>{t("messages.lbl_error_loading_block_data")}</ErrorMessage>
		);

	if (!dataState.candidateList || dataState.candidateList.length === 0)
		return <div>{t("commons.lbl_no_judgement_requested")}</div>;

	return (
		<div>
			{dataState.candidateList?.map((candidateInfo) => {
				return (
					<div key={candidateInfo.account} className="relative">
						<UserCard registrarInfo={candidateInfo} />
						<Button
							intent={Intent.PRIMARY}
							onClick={() => {
								void handleSubmitAddJudgement(candidateInfo.account);
							}}
							loading={addressLoading === candidateInfo.account}
							text={t("commons.lbl_add_judgement")}
							className="absolute top-2 right-2"
						/>
					</div>
				);
			})}
		</div>
	);
}
