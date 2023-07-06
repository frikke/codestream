"use strict";
// keep this as the first import
// tslint:disable-next-line:ordered-imports
// eslint-disable-next-line import/order
import "source-map-support/register";
import { createConnection, ProposedFeatures } from "vscode-languageserver";

import { CodeStreamAgent, FileLspLogger } from "./agent";

export * from "./providers/asana";
export * from "./providers/azuredevops";
export * from "./providers/bitbucket";
export * from "./providers/bitbucketServer";
export * from "./providers/circleci";
export * from "./providers/newrelic/vuln/nrVulnerability";
export * from "./providers/github";
export * from "./providers/githubEnterprise";
export * from "./providers/gitlab";
export * from "./providers/gitlabEnterprise";
export * from "./providers/jira";
export * from "./providers/jiraserver";
export * from "./providers/linear";
export * from "./providers/msteams";
export * from "./providers/newrelic";
export * from "./providers/okta";
export * from "./providers/shortcut";
export * from "./providers/slack";
export * from "./providers/trello";
export * from "./providers/trunk";
export * from "./providers/youtrack";

function handleFatalError(source: string, err: unknown) {
	console.error(`===--- ${source} fatal error ---=== `);
	console.error(err);
	process.abort(); // Core dump if possible
}

process.on("uncaughtException", e => handleFatalError("uncaughtException", e));
process.on("unhandledRejection", e => handleFatalError("unhandledRejection", e));

process.title = "CodeStream";

try {
	let logPath;
	process.argv.forEach(function (val, index, array) {
		if (val && val.indexOf("--log=") === 0) {
			logPath = val.substring(6);
		}
	});
	const logger = logPath != null ? new FileLspLogger(logPath) : undefined;

	const agentConfig = {
		logger: logger,
	};

	// Create a connection for the server. The connection uses Node's IPC as a transport.
	// Also include all preview / proposed LSP features.
	const connection = createConnection(ProposedFeatures.all);

	// Can't use logger here because it's not initialized yet
	// Can't use log / info here because it's used by lsp
	console.error("Codestream Starting...");

	new CodeStreamAgent(connection, agentConfig);

	connection.listen();
} catch (error) {
	handleFatalError("uncaught_main", error);
}
