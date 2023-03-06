import { ThirdPartyBuild } from "@codestream/protocols/agent";
import React, { Reducer, useReducer } from "react";
import { useSelector } from "react-redux";

import {
	NoContent,
	PaneNode,
	PaneNodeName,
} from "@codestream/webview/src/components/Pane";
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

	totalConfiguredProviders: number;
}

export const JenkinsBuilds = (props: Props) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		const preferences = getPreferences(state);

		const jobs = preferences[`jenkins:${props.jenkinsBaseUrl}`];

		return {
			jobs,
			totalConfiguredProviders: props.totalConfiguredProviders,
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

	const renderProjects = () => {
		return (
			<>
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
			</>
		);
	};

	return (
		<>
			{derivedState.totalConfiguredProviders > 1 &&
				derivedState.jobs.length === 0 &&
				Object.keys(props.projects).length === 0 && (
					<NoContent>No projects have been selected [settings].</NoContent>
				)}

			{derivedState.totalConfiguredProviders > 1 &&
				derivedState.jobs.length > 0 &&
				Object.keys(props.projects).length === 0 && (
					<NoContent>No builds found for selected projects.</NoContent>
				)}

			{derivedState.totalConfiguredProviders > 1 && (
				<PaneNode key={"jenkins"}>
					<PaneNodeName title={"Jenkins"} collapsed={false}></PaneNodeName>

					{renderProjects()}
				</PaneNode>
			)}

			{derivedState.totalConfiguredProviders === 1 && <h1>Jenkins</h1> && renderProjects()}

			{derivedState.jobs && derivedState.jobs.map(j => <span>{`${j.name} - ${j.slug}`}</span>)}

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
