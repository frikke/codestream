import { ThirdPartyBuild } from "@codestream/protocols/agent";
import React, { Reducer, useReducer } from "react";
import { useSelector } from "react-redux";

import { PaneNode, PaneNodeName } from "@codestream/webview/src/components/Pane";
import { BuildStatus } from "../BuildStatus";
import { setUserPreference } from "@codestream/webview/Stream/actions";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import { getPreferences } from "@codestream/webview/store/users/reducer";
import { CodeStreamState } from "@codestream/webview/store";

interface Props {
	jenkinsBaseUrl: string;
	projects: {
		[key: string]: ThirdPartyBuild[];
	};
}

export const JenkinsBuilds = (props: Props) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		const preferences = getPreferences(state);

		const jobs = preferences[`jenkins:${props.jenkinsBaseUrl}`];

		return {
			jobs,
		};
	});

	const dispatch = useAppDispatch();

	const addJobAsPreference = (jobName: string) => {
		dispatch(
			setUserPreference({
				prefPath: [`jenkins:${props.jenkinsBaseUrl}`][jobName],
				value: { urlSlug: jobName },
			})
		);
	};

	const [projectsCollapsed, toggleProjectCollapsed] = useReducer<
		Reducer<{ [key: string]: boolean }, string>
	>(
		(state, project) => ({
			...state,
			[project]: !state[project],
		}),
		{}
	);

	return (
		<>
			{<h1>Jenkins</h1>}

			{derivedState.jobs && derivedState.jobs.map(j => <span>{`${j.name} - ${j.slug}`}</span>)}

			{props.projects &&
				Object.entries(props.projects).map(([name, workflows]) => (
					<PaneNode key={`${name}`}>
						<PaneNodeName
							onClick={() => toggleProjectCollapsed(name)}
							title={name}
							collapsed={projectsCollapsed[name]}
						></PaneNodeName>
						<div style={{ padding: "0 20px 0 40px" }}>
							{!projectsCollapsed[name] &&
								workflows.map(workflow => {
									const data = {
										...workflow,
										title: workflow.id,
									};
									return <BuildStatus {...data} providerName="Jenkins" />;
								})}
						</div>
					</PaneNode>
				))}

			{
				<input
					className="input-text control"
					type="text"
					name="job-name"
					id="job-name"
					placeholder="Jenkins Job Name"
					onBlur={e => addJobAsPreference(e.target.value)}
				/>
			}
		</>
	);
};
