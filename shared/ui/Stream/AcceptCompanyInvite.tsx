import {
	JoinCompanyRequest,
	JoinCompanyRequestType,
	JoinCompanyResponse,
} from "@codestream/protocols/agent";
import { completeSignup } from "@codestream/webview/Authentication/actions";
import { setEnvironment } from "@codestream/webview/store/session/thunks";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import React from "react";
import styled from "styled-components";
import { logError } from "../logger";
import { Button } from "../src/components/Button";
import { Dialog } from "../src/components/Dialog";
import { CodeStreamState } from "../store";
import { goToLogin } from "../store/context/actions";
import { closeModal } from "./actions";

export function AcceptCompanyInvite() {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const user = state.users[state.session.userId!];
		return {
			currentOrganizationInvite: state.context.currentOrganizationInvite,
			userId: state.session.userId,
			userEmail: user.email,
			serverUrl: state.configs.serverUrl,
		};
	});

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

	const handleClickAccept = async () => {
		const { currentOrganizationInvite } = derivedState;
		try {
			if (currentOrganizationInvite.host) {
				// now switch environments (i.e., host, region, etc) to join this organization
				console.log(
					`Joining company ${currentOrganizationInvite.name} requires switching host to ${currentOrganizationInvite.host.name} at ${currentOrganizationInvite.host.publicApiUrl}`
				);
				dispatch(
					setEnvironment(
						currentOrganizationInvite.host.shortName,
						currentOrganizationInvite.host.publicApiUrl
					)
				);
			}

			const request: JoinCompanyRequest = {
				companyId: currentOrganizationInvite.id,
			};
			if (currentOrganizationInvite.host) {
				// explicitly add the environment to the request, since the switch-over may still be in progress
				// NOTE: we also add the server we are switching TO, since the call to set environments, above,
				// may not have actually sync'd through to the agent
				// isn't this fun???
				request.fromEnvironment = {
					serverUrl: derivedState.serverUrl,
					userId: derivedState.userId!,
					toServerUrl: currentOrganizationInvite.host.publicApiUrl,
				};
			}
			const result = (await HostApi.instance.send(
				JoinCompanyRequestType,
				request
			)) as JoinCompanyResponse;

			HostApi.instance.track("Joined Organization", {
				Availability: currentOrganizationInvite._type,
				"Auth Provider": "CodeStream",
			});
			dispatch(
				completeSignup(derivedState.userEmail!, result?.accessToken, result?.teamId, {
					createdTeam: false,
					provider: undefined,
					byDomain: true,
					setEnvironment: currentOrganizationInvite.host
						? {
								environment: currentOrganizationInvite.host.shortName,
								serverUrl: currentOrganizationInvite.host.publicApiUrl,
						  }
						: undefined,
				})
			);
		} catch (error) {
			const errorMessage = typeof error === "string" ? error : error.message;
			logError(`Unexpected error during company join: ${errorMessage}`, {
				companyId: currentOrganizationInvite.id,
			});
			dispatch(goToLogin());
		}

		dispatch(closeModal());
	};

	const handleClickDecline = () => {
		//@TODO handle decline logic once server-side work is complete
		dispatch(closeModal());
	};

	return (
		<Dialog title="Accept Invitation?" onClose={() => dispatch(closeModal())}>
			<p style={{ wordBreak: "break-word" }}>
				Do you want to accept your inviation to join {derivedState.currentOrganizationInvite.name}
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
