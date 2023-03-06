import React from "react";

import { configureAndConnectProvider } from "@codestream/webview/store/providers/actions";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import Icon from "../Icon";
import { IntegrationButtons, Provider } from "../IntegrationsPanel";

export const ConnectCICD = () => {
	const dispatch = useAppDispatch();
	return (
		<>
			<div className="filters" style={{ padding: "0 20px 10px 20px" }}>
				<span>
					Connect your CI/CD provider to see build status for the branch you&#8217;re currently
					checked out to.
				</span>
			</div>

			<IntegrationButtons noBorder style={{ marginBottom: "20px" }}>
				<Provider
					appendIcon
					style={{ maxWidth: "23em" }}
					key="circleci"
					onClick={() => dispatch(configureAndConnectProvider("circleci*com", "CI/CD Section"))}
				>
					<Icon name="circleci" />
					Connect to CircleCI
				</Provider>

				<Provider
					appendIcon
					style={{ maxWidth: "23em" }}
					key="jenkins"
					onClick={() => dispatch(configureAndConnectProvider("jenkins", "CI/CD Section"))}
				>
					<Icon name="jenkins" />
					Connect to Jenkins
				</Provider>
			</IntegrationButtons>
		</>
	);
};
