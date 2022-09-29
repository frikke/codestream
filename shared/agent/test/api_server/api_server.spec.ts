"use strict";

import { expect } from "chai";
import { describe, it } from "mocha";
import { RequestInit } from "node-fetch";
import { Connection } from "vscode-languageserver";
import { CodeStreamAgent } from "../../src/agent";
import {
	getRequest,
	loadTestData,
	TestAgent,
	TestConnection,
	TestSession,
	trimUndefined,
} from "./helpers";

async function runApiServerTest(dir: string, ctx: any) {
	const { agentOptions, agentRequests, csApiRequests, slackApiRequests } = await loadTestData(dir);

	const slackApiCall = async function (fnOrMethod: any, request: any, name: string) {
		const method = typeof fnOrMethod === "string" ? fnOrMethod : name;
		const slackApiRequest = getRequest(method, slackApiRequests);
		console.log(`Slack API request: ${method} OK`);
		trimUndefined(request);
		expect(request).to.deep.equal(slackApiRequest.request);
		return slackApiRequest.response;
	};
	const csApiFetch = async function (
		url: string,
		init?: RequestInit,
		token?: string
	): Promise<any> {
		const csApiRequest = getRequest(url, csApiRequests);
		console.log(`CS API request: ${url} OK`);
		const bodyString = init!.body;
		const body = typeof bodyString === "string" ? JSON.parse(bodyString) : bodyString;
		expect(body).to.deep.eq(csApiRequest.request);
		return csApiRequest.response;
	};

	const session = new TestSession(ctx.csAgent, ctx.connection, agentOptions, slackApiCall);
	// @ts-ignore
	const api = session._api! as any;
	// api.fetch = csApiFetch;

	// session.login();
	// void (await session.passwordLogin((agentOptions as unknown) as any));
	// await wait(1000);
	// @ts-ignore
	ctx.api = session._api!;
	ctx.agent._onReady.fire(undefined);

	for (const agentRequest of agentRequests) {
		console.log("Agent LSP request: " + agentRequest.method);
		const handler = ctx.agent.handlers.get(agentRequest.method);
		const response = await handler(agentRequest.request);
		trimUndefined(response);
		expect(response).to.deep.equal(
			agentRequest.response,
			"Agent LSP response did not match: " + agentRequest.method
		);
	}

	// for (const apiRequest of csApiRequests) {
	// 	console.log("Missed CS API request: " + apiRequest.url);
	// }

	// expect(csApiRequests).to.be.empty;
}

describe("CodeStream backend", function () {
	beforeEach(async function () {
		this.agent = new TestAgent();
		this.csAgent = this.agent as unknown as CodeStreamAgent;
		this.connection = new TestConnection() as unknown as Connection;
	});

	afterEach(async function () {
		await this.api.dispose();
	});

	it("logs in", async function () {
		await runApiServerTest("cs_login", this);
	});

	// it("loads a channel", async function() {
	// 	await runAcceptanceTest("cs_load_channel", this);
	// });
	//
	// it("posts to a channel", async function() {
	// 	await runAcceptanceTest("cs_post", this);
	// });
	//
	// it("loads a codemark from codemarks panel", async function() {
	// 	await runAcceptanceTest("cs_load_codemark", this);
	// });
});
