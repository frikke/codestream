import { UpdateTeamSettingsRequestType } from "@codestream/protocols/agent";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { Button } from "../src/components/Button";
import { Checkbox } from "../src/components/Checkbox";
import { ButtonRow, Dialog } from "../src/components/Dialog";
import { CodeStreamState } from "../store";
import { HostApi } from "../webview-api";

const Root = styled.div`
	h3 {
		margin: 10px 0 5px 0;
	}
	text-align: left;
`;

export const ConfigureBranchNames = (props: { onClose: Function }) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const teamId = state.context.currentTeamId;
		const team = state.teams[teamId];
		const settings = team.settings || {};

		return {
			teamId,
			branchMaxLength: settings.branchMaxLength,
			branchTicketTemplate: settings.branchTicketTemplate,
			branchPreserveCase: settings.branchPreserveCase,
		};
	});

	const [branchMaxLength, setBranchMaxLength] = useState(derivedState.branchMaxLength || 40);
	const [branchPreserveCase, setBranchPreserveCase] = useState(!!derivedState.branchPreserveCase);
	const [branchTicketTemplate, setBranchTicketTemplate] = useState(
		derivedState.branchTicketTemplate
	);

	const save = async () => {
		await HostApi.instance.send(UpdateTeamSettingsRequestType, {
			teamId: derivedState.teamId,
			// we need to replace . with * to allow for the creation of deeply-nested
			// team settings, since that's how they're stored in mongo
			settings: { branchMaxLength, branchTicketTemplate, branchPreserveCase },
		});
		props.onClose();
	};

	const Token = styled(props => {
		return (
			<div className={props.className}>
				<span className="monospace">{"{" + props.text + "}"}</span>
				{props.tip}
			</div>
		);
	})`
		padding: 2px 0;
		color: var(--text-color-subtle);
		.monospace {
			color: var(--text-color-highlight);
			display: inline-block;
			width: 8em;
		}
	`;

	return (
		<Root>
			<Dialog onClose={() => props.onClose()}>
				<div className="standard-form">
					<fieldset className="form-body">
						<div id="controls">
							<h3 style={{ margin: "0 0 5px 0" }}>Branch Name Template:</h3>
							<input
								name="branchTicketTemplate"
								value={branchTicketTemplate}
								className="input-text control"
								autoFocus
								type="text"
								onChange={e => setBranchTicketTemplate(e.target.value)}
								placeholder="Example: feature/jira-{id}"
							/>
						</div>
						<div style={{ margin: "30px 0 30px 0" }}>
							<h3>Available tokens:</h3>
							<Token text="username" tip="Your CodeStream username" />
							<Token text="team" tip="Your CodeStream Team name" />
							<Token text="title" tip="The title of the ticket/card/issue" />
							<Token text="id" tip="The id of the ticket/card/issue" />
							<Token text="date" tip="Date in YYYY-MM-DD format" />
							<Token text="provider" tip="The issue provider (trello, jira, etc)" />
						</div>
						<div id="controls">
							<h3>Maximum Branch Length:</h3>
							<input
								name="branchMaxLength"
								value={branchMaxLength}
								className="input-text control"
								type="text"
								onChange={e => setBranchMaxLength(e.target.value.replace(/\D/g, ""))}
							/>
						</div>
						<div style={{ height: "20px" }} />
						<div id="controls">
							<Checkbox
								name="preserve-case"
								checked={!branchPreserveCase}
								onChange={() => setBranchPreserveCase(!branchPreserveCase)}
							>
								Lowercase Branch Names
							</Checkbox>
						</div>
						<div style={{ height: "20px" }} />
						<ButtonRow>
							<div
								style={{
									float: "left",
									textAlign: "left",
									marginTop: "18px",
									fontSize: "smaller",
								}}
							>
								This is an organization setting.
							</div>
							<Button onClick={save}>Save Branch Template</Button>
						</ButtonRow>
					</fieldset>
				</div>
			</Dialog>
		</Root>
	);
};
