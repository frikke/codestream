import { FetchThirdPartyBuildsRequestType } from "@codestream/protocols/agent";
import React from "react";
import { useSelector } from "react-redux";

import { PaneNode, PaneNodeName } from "@codestream/webview/src/components/Pane";
import { setUserPreference } from "@codestream/webview/Stream/actions";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import { getPreferences } from "@codestream/webview/store/users/reducer";
import { CodeStreamState } from "@codestream/webview/store";
import { getUserProviderInfoFromState } from "@codestream/webview/store/providers/utils";
import { HostApi } from "@codestream/webview/webview-api";

interface Props {
	totalConfiguredProviders: number;
}

export const JenkinsBuilds = (props: Props) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		const preferences = getPreferences(state);
		const providerInfo = getUserProviderInfoFromState("jenkins", state);

		const jenkinsBaseUrl = providerInfo!["data"]!["baseUrl"];
		const jobs = preferences[`jenkins:${jenkinsBaseUrl}`];

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
				prefPath: [`jenkins:${derivedState.jenkinsBaseUrl}`][jobName],
				value: { urlSlug: jobName },
			})
		);
	};

	const fetchBuilds = async () => {
		const result = await HostApi.instance.send(FetchThirdPartyBuildsRequestType, {
			providerId: "jenkins",
		});
	};

	return (
		<>
			<PaneNode key={"jenkins"}>
				<PaneNodeName title={"Jenkins"} collapsed={false}></PaneNodeName>

				{derivedState.jobs && derivedState.jobs.map(j => <span>{`${j.name} - ${j.slug}`}</span>)}
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
		</>
	);
};
