import React from "react";

import { CodeStreamState } from "@codestream/webview/store";
import { isConnected } from "@codestream/webview/store/providers/reducer";
import { useSelector } from "react-redux";

/**
 * Will render child controls inside of connected if the supplied providerId is connected
 * @param props
 * @returns
 */
const ConditionalComponentBase = (props: {
	providerId: string;
	connected: any;
	disconnected: any;
}) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			isProviderConnected: isConnected(state, { id: props.providerId }),
		};
	});

	return derivedState.isProviderConnected ? props.connected : props.disconnected;
};

/**
 *  Will render child controls inside of connected if NewRelic is connected
 * @param props
 * @returns
 */
export const ConditionalNewRelic = (props: { connected: any; disconnected: any }) => {
	return <ConditionalComponentBase providerId="newrelic*com" {...props} />;
};
