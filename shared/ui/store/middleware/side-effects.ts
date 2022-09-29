/// <reference path="../../@types/window.d.ts"/>
import { fetchCodemarks } from "@codestream/webview/Stream/actions";
import { Middleware } from "redux";
import { BootstrapActionType } from "../bootstrapped/types";
import { setIssueProvider } from "../context/actions";
import { SessionState } from "../session/types";

// Do stuff based on data and not UI details
export const sideEffects: Middleware =
	({ dispatch, getState }) =>
	next =>
	action => {
		// Preempt fetching codemarks
		if (action.type === BootstrapActionType.Complete) {
			const session: SessionState = getState().session;
			if (session.userId) {
				window.requestIdleCallback(() => {
					// TODO: redundant calls can be made by both the components that need the data and here
					fetchCodemarks()(dispatch);
				});

				// Ensure the current issue provider is actually a valid issue provider
				const providers = getState().providers;
				const currentIssueProvider = getState().context.issueProvider;
				if (typeof currentIssueProvider !== "string" || !providers[currentIssueProvider]) {
					dispatch(setIssueProvider(undefined));
				}
			}
		}
		return next(action);
	};
