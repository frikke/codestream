import { ThirdPartyBuild } from "@codestream/protocols/agent";
import React, { Reducer, useReducer } from "react";

import { PaneNode, PaneNodeName } from "@codestream/webview/src/components/Pane";
import { BuildStatus } from "../BuildStatus";

interface Props {
	projects: {
		[key: string]: ThirdPartyBuild[];
	};
}

export const JenkinsBuilds = (props: Props) => {
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
									return <BuildStatus {...data} providerName="CircleCI" />;
								})}
						</div>
					</PaneNode>
				))}
			{Object.keys(props.projects).length === 0 && (
				<div style={{ padding: "0 20px 0 40px" }}>No builds found for branch on repo.</div>
			)}
		</>
	);
};
