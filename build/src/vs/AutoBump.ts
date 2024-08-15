import * as git from "../lib/Git";
import * as consoul from "../lib/Consoul";
import * as versioning from "../lib/Versioning";
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

	try {
		const newVersion = versioning.incrementVersion(version, "patch");
		versioning.setVersion(vsRootPath, "vs", newVersion);

		if (isWhatIfMode()) {
			consoul.info("***** RUNNING IN WHAT-IF MODE *****");

			consoul.info(
				`git commit -am "Auto bump version on develop to ${newVersion} for next release"`
			);
			consoul.info("git.fetch()");
			consoul.info("git.rebase()");
			consoul.info("git.push()");
		} else {
			git.commit(`Auto bump version on develop to ${newVersion} for next release`);

			git.fetch();
			git.rebase();
			git.push();
		}
	} catch (error) {
		console.error("Error executing command:", error);
		process.exit(1);
	}
}
