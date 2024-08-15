import * as consoul from "../lib/Consoul";
import { isWhatIfMode } from "./TeamCity";
import * as Versioning from "../lib/Versioning";

const iconMapping: Record<string, string> = {
	VS: "visualstudio-2022",
	VSC: "vscode",
	JB: "intellij"
};

const titleMapping: Record<string, string> = {
	VS: "Visual Studio",
	VSC: "Visual Studio Code",
	JB: "JetBrains"
};

export async function notify(product: string) {
	const fullVersion = process.env.build_number;

	if (!fullVersion) {
		consoul.error(`Unable to determine version from process.env.build_number"`);
		process.exit(1);
	}

	const [major, minor, patch] = Versioning.validateVersion(fullVersion);
	const version = `${major}.${minor}.${patch}`;

	const slackUrl = process.env.SLACK_URL;
	if (!slackUrl) {
		consoul.error(`Unable to determine version from process.env.SLACK_URL"`);
		process.exit(1);
	}

	let message = `:${iconMapping[product.toUpperCase()]}: ${titleMapping[product.toUpperCase()]} v${version} = :rocket:`;

	if (isWhatIfMode()) {
		message = `***** RUNNING IN WHAT-IF MODE *****\r\n${message}`;
	}
	const body = {
		text: message
	};

	await fetch(slackUrl, {
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json"
		},
		method: "POST",
		body: JSON.stringify(body)
	});
}
