import {
	FetchThirdPartyBuildsRequestType,
	FetchThirdPartyBuildsResponse,
} from "@codestream/protocols/agent";
import React, { useState } from "react";
import { useSelector } from "react-redux";

import { PaneNode, PaneNodeName } from "@codestream/webview/src/components/Pane";
import { setUserPreference } from "@codestream/webview/Stream/actions";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import { getPreferences } from "@codestream/webview/store/users/reducer";
import { CodeStreamState } from "@codestream/webview/store";
import { getUserProviderInfoFromState } from "@codestream/webview/store/providers/utils";
import { HostApi } from "@codestream/webview/webview-api";
import Icon from "../../Icon";
import { BuildStatus } from "../BuildStatus";

interface Props {
	totalConfiguredProviders: number;
}

/**
 * Jenkins differs from CirclCI, in that the top level is technically considered a "Job", which then has
 * "builds" beneath it.
 *
 * Trying to get this pattern to work with the existing CircleCI types proved interesting, so I tried to
 * set it up like this:
 *
 * 'Project' is the Job
 * 'ThirdPartyBuild' is the actual build
 *
 * However, when we render through <BuildStatus>, it self references down an interderminate amount of
 * builds.
 *
 * In Jenkins case, that "first" time through is really the job, and it doesn't have as much data about
 * it like CircleCI does - like "status" or "message". I've filled those out for now, but they may
 * not make sense in the long run
 */
export const JenkinsBuilds = (props: Props) => {
	const [builds, setBuilds] = useState<FetchThirdPartyBuildsResponse | undefined>(undefined);

	const derivedState = useSelector((state: CodeStreamState) => {
		const preferences = getPreferences(state);
		const providerInfo = getUserProviderInfoFromState("jenkins", state);

		const jenkinsBaseUrl = providerInfo!["data"]!["baseUrl"];
		const jobs = preferences[`jenkins`];

		return {
			jobs,
			totalConfiguredProviders: props.totalConfiguredProviders,
			jenkinsBaseUrl: jenkinsBaseUrl,
		};
	});

	const dispatch = useAppDispatch();

	const addJobAsPreference = (jobName: string) => {
		dispatch(
			setUserPreference({
				prefPath: [`jenkins`],
				value: [jobName],
			})
		);
	};

	/**
	 * Fetch everything, jobs, builds, etc.
	 * 'Builds' here isn't entirely true since its got projects and builds.
	 */
	const fetchBuilds = async () => {
		const result = await HostApi.instance.send(FetchThirdPartyBuildsRequestType, {
			providerId: "jenkins",
		});

		setBuilds(result);
	};

	return (
		<>
			<PaneNode key={"jenkins"}>
				<PaneNodeName title={"Jenkins"} collapsed={false}></PaneNodeName>

				{builds &&
					builds.projects &&
					Object.keys(builds.projects).map(p => {
						return (
							// Consider the zero-th entry to be the Job, and the builds from that are the ACTUAL builds
							<BuildStatus {...builds.projects[p][0]} providerName="Jenkins" />
						);
					})}
			</PaneNode>

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

			<Icon
				name="refresh"
				title="Refresh"
				placement="bottom"
				delay={1}
				onClick={e => {
					fetchBuilds();
				}}
			/>
		</>
	);
};
