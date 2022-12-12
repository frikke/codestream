import React from "react";
import styled from "styled-components";

import { configureAndConnectProvider } from "@codestream/webview/store/providers/actions";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import Icon from "../Icon";
import { IntegrationButtons, Provider } from "../IntegrationsPanel";
import { Link } from "@codestream/webview/Stream/Link";


const ProviderMissing = styled.div`
	text-align: center;
	padding: 0px 20px 0px 20px;
	margin-top: -20px;
`;

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

			<ProviderMissing>
				Don't see your service?{" "}
				<Link href="https://github.com/TeamCodeStream/codestream/issues?q=is%3Aissue+is%3Aopen+label%3A%22enhancement%22">
					Let us know.
				</Link>
			</ProviderMissing>
		</>
	);
};
