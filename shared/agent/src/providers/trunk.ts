import {
	CheckTrunkRequest,
	CheckTrunkRequestType,
	CheckTrunkResponse,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { log, lspHandler, lspProvider } from "../system";
import path from "path";
import fs from "fs";
import https from "https";
import { ThirdPartyProviderBase } from "providers/thirdPartyProviderBase";
import { exec } from "child_process";
import { promisify } from "util";
import { CodeStreamSession } from "session";
import { TrunkCheckResults } from "../../../util/src/protocol/agent/agent.protocol.trunk";

export const execAsync = promisify(exec);

@lspProvider("trunk")
export class TrunkProvider extends ThirdPartyProviderBase {
	constructor(
		public readonly session: CodeStreamSession,
		protected readonly providerConfig: ThirdPartyProviderConfig
	) {
		super(session, providerConfig);
	}

	get headers(): { [key: string]: string } {
		throw new Error("Method not implemented.");
	}

	get displayName() {
		return "Trunk.io";
	}

	get name() {
		return "trunk";
	}

	@lspHandler(CheckTrunkRequestType)
	@log()
	async checkRepo(request: CheckTrunkRequest): Promise<CheckTrunkResponse> {
		try {
			let outDirectory: string = "";
			let fullyQualifiedExecutable: string = "";

			// try to figure out where to download trunk
			if (process.env.XDG_CACHE_HOME) {
				outDirectory = path.resolve(process.env.XDG_CACHE_HOME, ".cache", "trunk", "launcher");
				fs.mkdirSync(outDirectory, { recursive: true });
				fullyQualifiedExecutable = path.join(outDirectory, "trunk");
			} else if (process.env.HOME) {
				outDirectory = path.resolve(process.env.HOME, ".cache", "trunk", "launcher");
				fs.mkdirSync(outDirectory, { recursive: true });
				fullyQualifiedExecutable = path.join(outDirectory, "trunk");
			} else {
				fullyQualifiedExecutable = path.resolve(request.cwd, "trunk");
			}

			const fullyQualifiedTrunkPath = path.resolve(request.cwd, ".trunk");
			const fullyQualifiedTrunkConfigurationFile = path.join(fullyQualifiedTrunkPath, "trunk.yaml");

			// DESIGN: We should probably store all the files as random names, maybe
			// in a subdirectory of the .trunk folder. Then when we do a full scan,
			// we can just delete the entire directory contents and start over.
			// Something like .trunk/codestream-cache/<random>.json
			const fullyQualifiedOutputStateFile = path.join(
				fullyQualifiedTrunkPath,
				"codestream-state.json"
			);

			//now actually try and download it
			if (!fs.existsSync(fullyQualifiedExecutable)) {
				await new Promise((resolve, error) => {
					https.get("https://trunk.io/releases/trunk", resp => {
						const writeStream = fs.createWriteStream(fullyQualifiedExecutable);
						resp.pipe(writeStream);
						writeStream.on("finish", () => {
							writeStream.close();
							resolve(fullyQualifiedExecutable);
						});
					});
				});

				// need to be user execute permission
				fs.chmodSync(fullyQualifiedExecutable, 0o755);
			}

			// DESIGN:
			// May want to split this part into a seperate method call so we can
			// alternate messaging on the client for each step

			// init the repo
			if (!fs.existsSync(fullyQualifiedTrunkConfigurationFile)) {
				await execAsync(`${fullyQualifiedExecutable} init -n --no-progress`, {
					cwd: request.cwd,
				});
			}

			// DESIGN:
			// Need an option on the request to check *SPECIFIC* files. An array of file
			// paths relative to repo-root?
			//
			// Then, how do we combine multiple distinct file runs with the overall run in a consistent manner?
			// Is there a time when we get TOO MANY singular run files and we need to force a full run again?
			//
			// Trunk command for that is:
			// await execAsync(
			//     `${fullyQualifiedExecutable} check <FILES> --no-fix --output-file="<MAYBE DIFFERENT OUTPUT FILE?>" --no-progress`,
			//     {
			//        cwd: request.cwd,
			//     }
			// );
			//
			// That should probably be a different method call, maybe overloads for a single file, or a list of files
			// and be able to modify the cache as necessary

			// run the actual check - or re-check if requested
			if (request.forceCheck || !fs.existsSync(fullyQualifiedOutputStateFile)) {
				try {
					await execAsync(
						`${fullyQualifiedExecutable} check --all --no-fix --output-file="${fullyQualifiedOutputStateFile}" --no-progress`,
						{
							cwd: request.cwd,
						}
					);
				} catch (error) {
					// I *believe* this is erroring because one of the linters is failing
					// which is okay. Unfortunately, not sure how to trap that *specific*
					// exception, so this may catch stuff we don't want it to
				}
			}

			if (!fs.existsSync(fullyQualifiedOutputStateFile)) {
				throw Error(`Output State File Not Found - '${fullyQualifiedOutputStateFile}'`);
			}

			// parse the output and toss it back to the UI
			const output = fs.readFileSync(fullyQualifiedOutputStateFile, "utf8");
			const results = JSON.parse(output) as TrunkCheckResults;

			// DESIGN:
			// Shove results into a cache the agent is managing. Key should be file uri/path.
			// Content should be an itemized list of the results for that file.
			// Then when we get partial scans on individual files, we can replace the contents
			// of the cache by key. When we do another full scan, we can just replace the cache.

			// The client will always want the full results of the cache, not an individual file or
			// even the full scan results.

			// We may also want a method to pull the results for a specific file from the cache given
			// a request from the client. This would be a seperate method call.

			return {
				results,
			};
		} catch (error) {
			throw new Error(`Exception thrown attempting to check repo with Trunk: ${error.message}`);
		}
	}
}
