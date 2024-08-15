import { execSync } from "child_process";
import fs from "fs";
import * as git from "../lib/Git";
import * as consoul from "../lib/Consoul";
import * as ssh from "../lib/SSH";
import { isWhatIfMode } from "../lib/TeamCity";
import * as Versioning from "../lib/Versioning";

export default function (vsRootPath: string) {
	const fullVersion = process.env.build_number;

	if (!fullVersion) {
		consoul.error(`Unable to determine version from process.env.build_number"`);
		process.exit(1);
	}

	const [major, minor, patch] = Versioning.validateVersion(fullVersion);
	const version = `${major}.${minor}.${patch}`;

	const asset = `${vsRootPath}\\artifacts\\codestream-vs-PROD-${version}.info`;

	try {
		if (!fs.existsSync(asset)) {
			consoul.error(`Unable to locate PI asset for release: "${asset}"`);
			process.exit(1);
		}

		const assetJson = JSON.parse(fs.readFileSync(asset, "utf-8"));
		const commitId = assetJson.CommitId;

		git.fetch();
		git.rebase();

		if (isWhatIfMode()) {
			consoul.info("***** RUNNING IN WHAT-IF MODE *****");
			consoul.info(`git.tag("vs", "${version}", "${commitId}")`);
			consoul.info(`git.pushTag("vs-${version}")`);
		} else {
			const tagName = git.tag("vs", version, commitId);

			git.pushTag(tagName);
		}
	} catch (error) {
		console.error("Error executing command:", error);
		process.exit(1);
	}
}
