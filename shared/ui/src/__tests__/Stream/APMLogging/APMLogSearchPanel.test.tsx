/**
 * @jest-environment jsdom
 */

import {
	GetLogFieldDefinitionsResponse,
	GetLogsResponse,
	GetObservabilityReposResponse,
} from "@codestream/protocols/agent";
import { createTheme } from "@codestream/webview/src/themes";
import { APMLogSearchPanel } from "@codestream/webview/Stream/APMLogging/APMLogSearchPanel";
import { HostApi } from "@codestream/webview/webview-api";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider } from "styled-components";

global.ResizeObserver = jest.fn().mockImplementation(() => ({
	observe: jest.fn(),
	unobserve: jest.fn(),
	disconnect: jest.fn(),
}));

jest.mock("@codestream/webview/webview-api");
jest.mock("react-resize-detector", () => ({
	useResizeDetector: jest.fn().mockImplementation(() => ({
		ref: null,
		width: 100,
		height: 100,
	})),
}));

let mockTrack = jest.fn();

describe("APM Logging Panel UI", () => {
	const ENTITY_GUID = "test-entity-guid";
	const ACCOUNT_ID = 1;
	const ENTRY_POINT = "test";

	afterEach(() => {
		jest.clearAllMocks();
	});

	beforeEach(() => {
		const MockedHostApi = HostApi as any;

		const mockHostApi = {
			track: mockTrack,
			on: () => {
				return {
					dispose: () => {},
				};
			},
			send: async (a: { method: string }, b, c) => {
				if (a.method === "codestream/newrelic/logs/fieldDefinitions") {
					return {
						logDefinitions: [
							{ key: "timestamp", type: "string" },
							{ key: "message", type: "string" },
						],
					} as GetLogFieldDefinitionsResponse;
				}
				if (a.method === "codestream/newrelic/logs/search") {
					return {
						logs: [{ timestamp: 1707336638905 }, { message: "test log record" }, { level: "info" }],
						accountId: ACCOUNT_ID,
					} as GetLogsResponse;
				}
				if (a.method === "codestream/newrelic/repos") {
					return {
						repos: [
							{
								repoId: "",
								repoName: "",
								repoRemote: "",
								hasCodeLevelMetricSpanData: false,
								entityAccounts: [
									{
										accountId: ACCOUNT_ID,
										accountName: "Administration",
										entityGuid: ENTITY_GUID,
										entityName: "Test Entity",
										entityType: "APM_APPLICATION_ENTITY",
										domain: "apm",
										displayName: "APM",
										tags: [
											{
												key: "",
												values: [""],
											},
										],
									},
								],
							},
						],
					} as GetObservabilityReposResponse;
				}

				return true;
			},
		};

		MockedHostApi.mockImplementation(() => {
			return mockHostApi;
		});

		MockedHostApi.instance = mockHostApi;
	});

	let container: HTMLDivElement | undefined = undefined;

	it("should render using basic required fields", async () => {
		const props = {
			entryPoint: "test",
		};

		await act(async () => {
			render(
				<ThemeProvider theme={createTheme()}>
					<APMLogSearchPanel {...props}></APMLogSearchPanel>
				</ThemeProvider>,
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("query-btn")).toBeEnabled();
			expect(screen.queryByTestId("query-text")).toHaveFocus();
			expect(screen.queryByTestId("query-text")).not.toHaveValue();

			expect(mockTrack).toHaveBeenCalledTimes(1);
			expect(mockTrack).toHaveBeenCalledWith("codestream/logs/webview displayed", {
				event_type: "modal_display",
				meta_data: `entry_point: ${props.entryPoint}`,
			});
		});
	});

	it("should render and execute search without supplying query", async () => {
		const props = {
			entryPoint: ENTRY_POINT,
			entityGuid: ENTITY_GUID,
		};

		await act(async () => {
			render(
				<ThemeProvider theme={createTheme()}>
					<APMLogSearchPanel {...props}></APMLogSearchPanel>
				</ThemeProvider>,
				{ container }
			);
		});

		await waitFor(() => {
			expect(mockTrack).toHaveBeenCalledTimes(2);
			expect(mockTrack).toHaveBeenCalledWith("codestream/logs/webview displayed", {
				event_type: "modal_display",
				entity_guid: ENTITY_GUID,
				account_id: ACCOUNT_ID,
				meta_data: `entry_point: ${ENTRY_POINT}`,
			});
			expect(mockTrack).toHaveBeenCalledWith("codestream/logs/search succeeded", {
				event_type: "response",
				entity_guid: ENTITY_GUID,
				account_id: ACCOUNT_ID,
				meta_data: `results_returned: true`,
				meta_data_2: `entity_type: APM`,
			});
		});
	});
});
