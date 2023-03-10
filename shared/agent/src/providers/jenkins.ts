"use strict";

import { log, lspProvider } from "../system";
import { ThirdPartyBuildProviderBase } from "./thirdPartyBuildProviderBase";
import { CSJenkinsProviderInfo } from "@codestream/protocols/api";
import {
	FetchThirdPartyBuildsRequest,
	FetchThirdPartyBuildsResponse,
	ProviderConfigurationData,
	ThirdPartyBuild,
	ThirdPartyBuildStatus,
} from "@codestream/protocols/agent";
import { SessionContainer } from "../container";
import { JenkinsJobResponse, JenkinsBuildResponse } from "./jenkins.types";

@lspProvider("jenkins")
export class JenkinsCIProvider extends ThirdPartyBuildProviderBase<CSJenkinsProviderInfo> {
	get displayName(): string {
		return "Jenkins";
	}

	get headers(): { [p: string]: string } {
		return {
			Accept: "application/json",
			Authorization: `Basic ${this.accessToken}`,
			"Content-Type": "application/json",
		};
	}

	get name(): string {
		return "jenkins";
	}

	get baseUrl(): string {
		return this._providerInfo?.data?.baseUrl || "";
	}

	async onConnected(providerInfo?: CSJenkinsProviderInfo) {
		await super.onConnected(providerInfo);
	}

	async ensureInitialized() {}

	async verifyConnection(config: ProviderConfigurationData): Promise<void> {
		await this.getVersion();
	}

	@log()
	protected async getVersion(): Promise<void> {
		try {
			await this.ensureConnected();

			const response = await this.get<any>(
				`/user/${this._providerInfo?.userId}/api/json`,
				this.headers
			);
			const header = response?.response?.headers?.get("X-Jenkins");

			if (!header || header.length < 1) {
				throw new Error("Unable to validate Jenkins version using supplied values.");
			}
		} catch (ex) {
			throw ex;
		}
	}

	@log()
	async fetchBuilds(request: FetchThirdPartyBuildsRequest): Promise<FetchThirdPartyBuildsResponse> {
		await this.ensureConnected();

		const { users } = SessionContainer.instance();
		const me = await users.getMe();
		const jobSlugs = me!.preferences![`jenkins`];

		const jobs: { [key: string]: ThirdPartyBuild[] } = {};

		for (const jobSlug of jobSlugs) {
			const jobResponse = await this.get<JenkinsJobResponse>(
				`/job/${jobSlug}/api/json`,
				this.headers
			);
			const job = jobResponse.body;
			const lastFiveBuildsMeta = job.builds.slice(0, 5).sort((b1, b2) => {
				return b1.number - b2.number;
			});

			const lastFiveBuilds = await Promise.all(
				lastFiveBuildsMeta.map(async (buildMeta, index) => {
					const buildResponse = await this.get<JenkinsBuildResponse>(
						`/job/${jobSlug}/${buildMeta.number}/api/json`,
						this.headers
					);
					const build = buildResponse.body;
					const jobStatus = ThirdPartyBuildStatus.Success;

					//this seems to work okay for the ACTUAL builds, mapping into the original CircleCI type of 'ThirdPartyBuild
					//though there are some things here omitted, as I dont have a match.
					return {
						id: `${jobSlug}|${build.number}`,
						status: jobStatus,
						message: `${build.fullDisplayName} / ${build.description}`,
						duration: this.formatDurationFromMilliseconds(build.duration),
						finished: new Date(build.timestamp),
						url: `${this.baseUrl}/job/${jobSlug}/${buildMeta.number}`,
						logsUrl: `${this.baseUrl}/job/${jobSlug}/${buildMeta.number}/console`,
					};
				})
			);

			// calling these jobs, but you'll see they get added to the result as 'projects'
			// a lot of these don't make a TON of sense, hence why so many are omitted.
			// A big example of some discrepancy is the 'Status' and 'Message' here...
			// There really isn't one of these for Jenkins jobs, so we'll need to revisit (probably)
			jobs[jobSlug] = [];
			jobs[jobSlug].push({
				id: `${jobSlug}`,
				status: ThirdPartyBuildStatus.Unknown,
				message: jobResponse.body.healthReport[0].description,
				builds: lastFiveBuilds,
				url: `${this.baseUrl}/job/${jobSlug}`,
			});
		}

		return {
			projects: jobs,
			dashboardUrl: "",
		};
	}
}
