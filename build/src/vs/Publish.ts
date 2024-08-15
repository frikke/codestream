import { execSync } from "child_process";
import fs from "fs";
import * as consoul from "../lib/Consoul";
import * as ssh from "../lib/SSH";
import { isWhatIfMode } from "../lib/TeamCity";
import * as Versioning from "../lib/Versioning";

interface TokenFile {
	publishers: {
		name: string;
		pat: string;
	}[];
}

export default function (vsRootPath: string) {
	const fullVersion = process.env.build_number;

	if (!fullVersion) {
		consoul.error(`Unable to determine version from process.env.build_number"`);
		process.exit(1);
	}

	const [major, minor, patch] = Versioning.validateVersion(fullVersion);
	const version = `${major}.${minor}.${patch}`;

	const localVSCETokenFile = `${process.env.TEMP}\\codestream.vsce`;
	const remoteVSCETokenFile = "/home/web/.codestream/microsoft/vsce-credentials";
	const asset = `${vsRootPath}\\artifacts\\codestream-vs-PROD-${version}.vsix`;
	const vsixPublisher =
		"C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VSSDK\\VisualStudioIntegration\\Tools\\Bin\\VsixPublisher.exe";

	try {
		if (!fs.existsSync(asset)) {
			consoul.error(`Unable to locate PI asset for release: "${asset}"`);
			process.exit(1);
		}

		ssh.copyRemoteFile(remoteVSCETokenFile, localVSCETokenFile);

		const tokenJson = JSON.parse(fs.readFileSync(localVSCETokenFile, "utf-8")) as TokenFile;
		const token = tokenJson.publishers.find(p => {
			return p.name.toLowerCase() === "codestream";
		})?.pat;

		const publishCommand = `"${vsixPublisher}" publish -payload "${asset}" -publishManifest "publishManifest.json" -personalAccessToken "${token}"`;

		if (isWhatIfMode()) {
			consoul.info("***** RUNNING IN WHAT-IF MODE *****");
			consoul.info(publishCommand);
		} else {
			execSync(publishCommand, {
				stdio: "inherit",
				cwd: `${vsRootPath}\\src\\CodeStream.VisualStudio.Vsix.x64\\dist\\publish`
			});
		}
	} catch (error) {
		console.error("Error executing command:", error);
		process.exit(1);
	} finally {
		if (fs.existsSync(localVSCETokenFile)) {
			fs.rmSync(localVSCETokenFile);
		}
	}
}
