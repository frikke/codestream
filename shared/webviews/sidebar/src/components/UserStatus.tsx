import styled from "styled-components";
import React from "react";
import { CSUser } from "@codestream/protocols/api";

import { useAppDispatch, useAppSelector } from "@codestream/sidebar/utilities/hooks";
import { MarkdownText } from "@codestream/sidebar/Stream/MarkdownText";
import Icon from "@codestream/sidebar/Stream/Icon";
import { HostApi } from "@codestream/sidebar/sidebar-api";
import { OpenUrlRequestType } from "../../ipc/host.protocol";
import { CodeStreamState } from "@codestream/sidebar/store";
import { WebviewPanels } from "@codestream/protocols/api";
import { openPanel } from "@codestream/sidebar/Stream/actions";

const Root = styled.span`
	padding-left: 10px;
	display: inline-flex;
	align-items: top;
	.icon {
		margin-right: 5px;
	}
	.icons {
		margin-left: auto;
		visibility: hidden;
		white-space: nowrap;
		.icon {
			margin-right: 0;
			margin-left: 5px;
		}
	}
	&:hover .icons {
		visibility: visible;
	}
`;

const formatTheDate = time => {
	const date = new Date(time);
	return date.toLocaleString();
};

export function UserStatus(props: { user: CSUser; className?: string }) {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const teamId = state.context.currentTeamId;
		return {
			isMe: props.user.id === state.session.userId!,
			teamId,
		};
	});

	const { status } = props.user;
	if (!status || !status[derivedState.teamId] || !status[derivedState.teamId].label) return null;

	const handleClick = () => {
		if (status.ticketUrl) {
			HostApi.sidebarInstance.send(OpenUrlRequestType, {
				url: status[derivedState.teamId].ticketUrl,
			});
		}
	};

	return (
		<Root className={props.className}>
			{status.ticketProvider ? (
				<Icon name={status[derivedState.teamId].ticketProvider} />
			) : (
				<Icon name="ticket" />
			)}
			<MarkdownText text={status[derivedState.teamId].label} inline={true}></MarkdownText>
			<div className="icons">
				{status.ticketUrl && <Icon name="globe" className="clickable" onClick={handleClick} />}
				{derivedState.isMe && (
					<Icon
						name="pencil"
						className="clickable"
						onClick={() => dispatch(openPanel(WebviewPanels.Status))}
					/>
				)}
			</div>
		</Root>
	);
}
