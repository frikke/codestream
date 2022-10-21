import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React from "react";
import styled from "styled-components";
import { Button } from "../src/components/Button";
import { Dialog } from "../src/components/Dialog";
import { CodeStreamState } from "../store";
import { closeModal } from "./actions";

export function AcceptCompanyInvite() {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { currentCompanyInvite } = state.preferences;

		return {
			currentCompanyInviteName: currentCompanyInvite || "",
		};
	});

	const [companyName, setCompanyName] = React.useState("");

	const ButtonRow = styled.div`
		text-align: center;
		margin-top: 20px;
		display: flex;
		margin: 20px -10px 0 -10px;
		button {
			flex-grow: 1;
			margin: 0 10px;
			width: 100%;
			padding: 5px 10px;
			line-height: 1.25em;
		}
	`;

	const handleClickAccept = () => {
		dispatch(closeModal());
	};

	const handleClickDecline = () => {
		dispatch(closeModal());
	};

	return (
		<Dialog title="Accept Invitation?" onClose={() => dispatch(closeModal())}>
			<p style={{ wordBreak: "break-word" }}>
				Do you want to accept your inviation to join {derivedState.currentCompanyInviteName}
			</p>
			<ButtonRow>
				<Button onClick={handleClickAccept} tabIndex={0}>
					Accept
				</Button>
				<Button variant="secondary" onClick={handleClickDecline} tabIndex={0}>
					Decline
				</Button>
			</ButtonRow>
		</Dialog>
	);
}
