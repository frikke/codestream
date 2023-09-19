import { configureAndConnectProvider } from "@codestream/sidebar/store/providers/actions";
import { useAppDispatch } from "@codestream/sidebar/utilities/hooks";
import React from "react";
import Icon from "../Icon";
import { Provider } from "../IntegrationsPanel";

export const ConnectCICD = () => {
	const dispatch = useAppDispatch();
	return (
		<>
			<div className="filters" style={{ padding: "0 20px 10px 20px" }}>
				<span>
					Connect to CircleCI to see build status for the branch you&#8217;re currently checked out
					to.
				</span>
			</div>

			<div style={{ padding: "0 20px 20px 20px" }}>
				<Provider
					appendIcon
					style={{ maxWidth: "23em" }}
					key="circleci"
					onClick={() => dispatch(configureAndConnectProvider("circleci*com", "CI/CD Section"))}
				>
					<Icon name="circleci" />
					Connect to CircleCI
				</Provider>
			</div>
		</>
	);
};
