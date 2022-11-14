import { env, Uri } from "vscode";
import { AgentOpenUrlRequestType } from "codestream-common/agent-protocol";

import { Container } from "./container";

export async function openUrl(url: string) {
	// if the user is running a remote session, use openExternal
	// if not, send it back to the agent
	if (env && env.remoteName && env.remoteName !== undefined) {
		await env.openExternal(Uri.parse(url));
	} else {
		await Container.agent.sendRequest(AgentOpenUrlRequestType, { url: url });
	}
}
