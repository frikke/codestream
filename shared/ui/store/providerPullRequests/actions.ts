import { action } from "../common";
import { ProviderPullRequestActionsTypes } from "./types";
import { logError } from "@codestream/webview/logger";
import { HostApi } from "@codestream/webview/webview-api";
import {
	FetchThirdPartyPullRequestRequestType,
	FetchThirdPartyPullRequestResponse,
	ExecuteThirdPartyTypedType,
	ExecuteThirdPartyTypedRequest,
	GetMyPullRequestsRequest,
	GetMyPullRequestsResponse,
	FetchThirdPartyPullRequestCommitsType
} from "@codestream/protocols/agent";
import { CodeStreamState } from "..";
import { RequestType } from "vscode-languageserver-protocol";

export const reset = () => action("RESET");

export const _addPullRequestConversations = (providerId: string, id: string, pullRequest: any) =>
	action(ProviderPullRequestActionsTypes.AddPullRequestConversations, {
		providerId,
		id,
		pullRequest
	});

export const _addPullRequestFiles = (providerId: string, id: string, pullRequestFiles: any) =>
	action(ProviderPullRequestActionsTypes.AddPullRequestFiles, {
		providerId,
		id,
		pullRequestFiles
	});

export const _addPullRequestCommits = (providerId: string, id: string, pullRequestCommits: any) =>
	action(ProviderPullRequestActionsTypes.AddPullRequestCommits, {
		providerId,
		id,
		pullRequestCommits
	});

export const _addMyPullRequests = (providerId: string, data: any) =>
	action(ProviderPullRequestActionsTypes.AddMyPullRequests, {
		providerId,
		data
	});

export const getPullRequestConversationsFromProvider = (
	providerId: string,
	id: string
) => async dispatch => {
	try {
		const response = await HostApi.instance.send(FetchThirdPartyPullRequestRequestType, {
			providerId: providerId,
			pullRequestId: id
		});
		dispatch(_addPullRequestConversations(providerId, id, response));
		return response as FetchThirdPartyPullRequestResponse;
	} catch (error) {
		logError(`failed to refresh pullRequest: ${error}`, { providerId, id });
	}
	return undefined;
};

export const getPullRequestConversations = (providerId: string, id: string) => async (
	dispatch,
	getState: () => CodeStreamState
) => {
	try {
		const state = getState();
		const provider = state.providerPullRequests.pullRequests[providerId];
		if (provider) {
			const pr = provider[id];
			if (pr && pr.conversations) {
				console.log(
					`fetched pullRequest conversations from store providerId=${providerId} id=${id}`
				);
				return pr.conversations;
			}
		}
		const response = await HostApi.instance.send(FetchThirdPartyPullRequestRequestType, {
			providerId: providerId,
			pullRequestId: id
		});
		dispatch(_addPullRequestConversations(providerId, id, response));
		return response;
	} catch (error) {
		logError(`failed to get pullRequest conversations: ${error}`, { providerId, id });
	}
	return undefined;
};

/**
 * This resets the provider's files changed list
 * @param providerId
 * @param id
 */
export const clearPullRequestFiles = (providerId: string, id: string) =>
	action(ProviderPullRequestActionsTypes.ClearPullRequestFiles, {
		providerId,
		id
	});

export const getPullRequestFiles = (providerId: string, id: string) => async (
	dispatch,
	getState: () => CodeStreamState
) => {
	try {
		const state = getState();
		const provider = state.providerPullRequests.pullRequests[providerId];
		if (provider) {
			const pr = provider[id];
			if (pr && pr.files && pr.files.length) {
				console.log(`fetched pullRequest files from store providerId=${providerId} id=${id}`);
				return pr.files;
			}
		}
		const response = await HostApi.instance.send(new ExecuteThirdPartyTypedType<any, any>(), {
			method: "getPullRequestFilesChanged",
			providerId: providerId,
			params: {
				pullRequestId: id
			}
		});

		dispatch(_addPullRequestFiles(providerId, id, response));
		return response;
	} catch (error) {
		logError(`failed to get pullRequest files: ${error}`, { providerId, id });
	}
	return undefined;
};

export const clearMyPullRequests = (providerId: string) =>
	action(ProviderPullRequestActionsTypes.ClearMyPullRequests, {
		providerId
	});

export const removeFromMyPullRequests = (providerId: string, id: string) =>
	action(ProviderPullRequestActionsTypes.RemoveFromMyPullRequests, {
		providerId,
		id
	});

export const getMyPullRequests = (providerId: string, options?: { force?: boolean }) => async (
	dispatch,
	getState: () => CodeStreamState
) => {
	try {
		let force = false;
		if (!options || !options.force) {
			const state = getState();
			const provider = state.providerPullRequests.myPullRequests[providerId];
			if (provider && provider.data != null) {
				console.log(`fetched myPullRequest data from store providerId=${providerId}`);
				return provider.data;
			}
			// if the data was wiped... set force to get data from the provider api and
			// bypass our cache
			force = true;
		}
		const request = new RequestType<
			ExecuteThirdPartyTypedRequest<GetMyPullRequestsRequest>,
			GetMyPullRequestsResponse[],
			any,
			any
		>("codestream/provider/generic");
		const response = await HostApi.instance.send(request, {
			method: "getMyPullRequests",
			providerId: "github*com",
			params: {
				force: force || (options && options.force),
				isOpen: true
			}
		});

		dispatch(_addMyPullRequests(providerId, response));
		return response;
	} catch (error) {
		logError(`failed to get my pullRequests: ${error}`, { providerId });
	}
	return undefined;
};

export const clearPullRequestCommits = (providerId: string, id: string) =>
	action(ProviderPullRequestActionsTypes.ClearPullRequestCommits, {
		providerId,
		id
	});

export const getPullRequestCommitsFromProvider = (
	providerId: string,
	id: string
) => async dispatch => {
	try {
		const response = await HostApi.instance.send(FetchThirdPartyPullRequestCommitsType, {
			providerId,
			pullRequestId: id
		});
		dispatch(_addPullRequestCommits(providerId, id, response));
		return response;
	} catch (error) {
		logError(`failed to refresh pullRequest commits: ${error}`, { providerId, id });
	}
	return undefined;
};

export const getPullRequestCommits = (providerId: string, id: string) => async (
	dispatch,
	getState: () => CodeStreamState
) => {
	try {
		const state = getState();
		const provider = state.providerPullRequests.pullRequests[providerId];
		if (provider) {
			const pr = provider[id];
			if (pr && pr.commits && pr.commits.length) {
				console.log(`fetched pullRequest commits from store providerId=${providerId} id=${id}`);
				return pr.commits;
			}
		}
		const response = await HostApi.instance.send(FetchThirdPartyPullRequestCommitsType, {
			providerId: providerId,
			pullRequestId: id
		});
		dispatch(_addPullRequestCommits(providerId, id, response));
		return response;
	} catch (error) {
		logError(`failed to get pullRequest commits: ${error}`, { providerId, id });
	}
	return undefined;
};
