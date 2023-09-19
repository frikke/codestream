/**
 * @jest-environment jsdom
 */
import { FetchThirdPartyPullRequestCommitsResponse } from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/sidebar/store";
import * as providerPullRequestActions from "@codestream/sidebar/store/providerPullRequests/thunks";
import { GetPullRequestCommitsRequest } from "@codestream/sidebar/store/providerPullRequests/thunks";
import { PullRequestCommitsTab } from "@codestream/sidebar/Stream/PullRequestCommitsTab";
import { HostApi } from "@codestream/sidebar/sidebar-api";
import { AsyncThunkAction } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "../../themes";

jest.mock("@codestream/sidebar/webview-api");
jest.mock("@codestream/sidebar/store/providerPullRequests/thunks");

const providerPullRequestActionsMock = jest.mocked(providerPullRequestActions);
const middlewares = [thunk];
const MockedHostApi = HostApi as any;

const mockHostApi = {
	track: jest.fn(),
	on: jest.fn(),
	send: jest.fn(),
};

MockedHostApi.mockImplementation(() => {
	return mockHostApi;
});

// YUCK yuck yuck, static singletons are bad bad bad for testing
MockedHostApi.instance = mockHostApi;

const baseState: Partial<CodeStreamState> = {
	context: {
		currentPullRequest: {
			id: "something",
			providerId: "bitbucket*org",
		},
	} as any,
	providerPullRequests: {
		myPullRequests: {},
		pullRequests: {},
	},
	capabilities: {
		openLink: true,
	},
};

describe("PullRequestCommitsTab", () => {
	const pr = {
		providerId: "bitbucket*org",
		url: "https://example.com",
	};

	it("Should show commits in order across different years", async () => {
		const mockStore = configureStore(middlewares);

		const pullRequestCommitsResponse: FetchThirdPartyPullRequestCommitsResponse[] = [
			{
				abbreviatedOid: "123456",
				author: {
					avatarUrl: "blah",
					name: "jdoe",
					user: {
						login: "jdoe",
					},
				},
				committer: {
					avatarUrl: "blah",
					name: "jdoe",
					user: {
						login: "jdoe",
					},
				},
				message: "my message 2",
				authoredDate: "2022-09-06T14:58:24.244Z",
				oid: "1234567890",
				url: "https://example.com",
			},
			{
				abbreviatedOid: "123456",
				author: {
					avatarUrl: "blah",
					name: "jdoe",
					user: {
						login: "jdoe",
					},
				},
				committer: {
					avatarUrl: "blah",
					name: "jdoe",
					user: {
						login: "jdoe",
					},
				},
				message: "my message 1",
				authoredDate: "2021-09-06T14:58:24.244Z",
				oid: "1234567890",
				url: "https://example.com",
			},
		];

		const mockAsyncThunkResponse = {
			type: "providerPullRequests/getPullRequestCommits",
			unwrap: () => {
				return Promise.resolve(pullRequestCommitsResponse);
			},
		} as unknown;

		providerPullRequestActionsMock.getPullRequestCommits.mockReturnValue(
			mockAsyncThunkResponse as AsyncThunkAction<
				FetchThirdPartyPullRequestCommitsResponse[] | undefined,
				GetPullRequestCommitsRequest,
				{}
			>
		);

		await act(async () => {
			render(
				<Provider store={mockStore(baseState)}>
					<ThemeProvider theme={lightTheme}>
						<PullRequestCommitsTab pr={pr} />
					</ThemeProvider>
				</Provider>
			);
		});

		await waitFor(() => {
			const expectedOrder = ["2021-09-06T00:00:00.000Z", "2022-09-06T00:00:00.000Z"];
			const elements = screen.queryAllByTestId(/202\d\-09\-06.*/);
			expect(Array.from(elements).map(el => el.getAttribute("data-testid"))).toEqual(expectedOrder);
		});
	});

	it("Should show commits in order of time", async () => {
		const mockStore = configureStore(middlewares);

		const pullRequestCommitsResponse: FetchThirdPartyPullRequestCommitsResponse[] = [
			{
				abbreviatedOid: "22222",
				author: {
					avatarUrl: "blah",
					name: "jdoe",
					user: {
						login: "jdoe",
					},
				},
				committer: {
					avatarUrl: "blah",
					name: "jdoe",
					user: {
						login: "jdoe",
					},
				},
				message: "my message 2",
				authoredDate: "2022-09-06T15:58:24.244Z",
				oid: "1234567890",
				url: "https://example.com",
			},
			{
				abbreviatedOid: "11111",
				author: {
					avatarUrl: "blah",
					name: "jdoe",
					user: {
						login: "jdoe",
					},
				},
				committer: {
					avatarUrl: "blah",
					name: "jdoe",
					user: {
						login: "jdoe",
					},
				},
				message: "my message 1",
				authoredDate: "2022-09-06T14:58:24.244Z",
				oid: "1234567890",
				url: "https://example.com",
			},
		];

		const mockAsyncThunkResponse = {
			type: "providerPullRequests/getPullRequestCommits",
			unwrap: () => {
				return Promise.resolve(pullRequestCommitsResponse);
			},
		} as unknown;

		providerPullRequestActionsMock.getPullRequestCommits.mockReturnValue(
			mockAsyncThunkResponse as AsyncThunkAction<
				FetchThirdPartyPullRequestCommitsResponse[] | undefined,
				GetPullRequestCommitsRequest,
				{}
			>
		);

		await act(async () => {
			render(
				<Provider store={mockStore(baseState)}>
					<ThemeProvider theme={lightTheme}>
						<PullRequestCommitsTab pr={pr} />
					</ThemeProvider>
				</Provider>
			);
		});

		await waitFor(() => {
			const expectedOrder = ["commit-11111", "commit-22222"];
			const elements = screen.queryAllByTestId(/commit-(.*)/);
			expect(Array.from(elements).map(el => el.getAttribute("data-testid"))).toEqual(expectedOrder);
		});
	});
});
