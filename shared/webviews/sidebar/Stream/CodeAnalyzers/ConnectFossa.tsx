import React from "react";
import { useAppDispatch } from "@codestream/sidebar/utilities/hooks";
import { configureAndConnectProvider } from "@codestream/sidebar/store/providers/actions";
import { Provider, IntegrationButtons } from "../IntegrationsPanel";
import { NoContent } from "../../src/components/Pane";
import Icon from "../Icon";

export const ConnectFossa = () => {
	const dispatch = useAppDispatch();
	return (
		<>
			<NoContent>Connect to FOSSA to see vulnerabilities and license dependencies.</NoContent>
			<IntegrationButtons noBorder>
				<Provider
					appendIcon
					key="fossa"
					onClick={() =>
						dispatch(configureAndConnectProvider("fossa*com", "Code Analyzers Section"))
					}
				>
					<Icon name="fossa" />
				</Provider>
			</IntegrationButtons>
		</>
	);
};
