import https from "https";
import * as consoul from "./lib/Consoul.ts";
import * as git from "./lib/Git.ts";

let version = process.argv[2];
const entityGuid = process.argv[3];
const NR_API_KEY = process.env.NR_API_KEY;
const ERR_EXIT_CODE = 0; // For now non-fatal exit code
const MAX_RETRIES = 3; // Set the maximum number of retries

if (!version || !entityGuid || !NR_API_KEY) {
	consoul.error("Missing arguments or environment variables");
	process.exit(ERR_EXIT_CODE);
}

version = version.toLowerCase().trim();

let commit;
try {
	commit = git.getRevision();
} catch (error) {
	consoul.error("Error getting commit from git");
	process.exit(ERR_EXIT_CODE);
}

consoul.info(
	`Sending deployment event to New Relic for version ${version}, entityGuid ${entityGuid}, commit ${commit}`
);

const DATA = `{"query": "mutation { changeTrackingCreateDeployment( deployment: { version: \\"${version}\\", entityGuid: \\"${entityGuid}\\", commit: \\"${commit}\\" } ) { deploymentId entityGuid } }"}`;

const options = {
	hostname: "staging-api.newrelic.com",
	path: "/graphql",
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json",
		"Api-Key": NR_API_KEY,
		"NewRelic-Requesting-Services": "CodeStream"
	}
};

function sendRequest(retries: number) {
	const req = https.request(options, res => {
		let data = "";

		res.on("data", chunk => {
			data += chunk;
		});

		res.on("end", () => {
			const statusCode = res.statusCode || 500;
			if (statusCode < 200 || statusCode >= 400) {
				consoul.error("Error sending deployment event to New Relic");
				consoul.error(`HTTP Status: ${res.statusCode}`);
				consoul.error(`Response: ${data}`);
				process.exit(ERR_EXIT_CODE);
			} else {
				consoul.info("Deployment event sent to New Relic");
			}
		});
	});

	req.on("error", error => {
		if (retries > 0) {
			consoul.info("Retrying request...");
			sendRequest(retries - 1);
		} else {
			consoul.error("Error sending deployment event to New Relic");
			consoul.error(`Response: ${error.message}`);
			process.exit(ERR_EXIT_CODE);
		}
	});

	req.write(DATA);
	req.end();
}

sendRequest(MAX_RETRIES);
