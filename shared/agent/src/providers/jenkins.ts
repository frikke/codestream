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
import { JenkinsJobResponse } from "./jenkins.types";

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
		const jobs = me!.preferences![`jenkins:${this.baseUrl}`];

		const projects: { [key: string]: ThirdPartyBuild[] } = {};

		for (const j of jobs) {
			const jobSlug = j.slug;

			const response = await this.get<JenkinsJobResponse>(`/job/${jobSlug}/api/json`, this.headers);

			const lastFiveBuilds = response.body.builds.slice(0, 5);

			for (const b in lastFiveBuilds) {
				projects[jobSlug].push({
					id: jobSlug,
					status: ThirdPartyBuildStatus.Unknown,
					message: "",
					duration: "",
					builds: [],
					url: `${this.baseUrl}/job/${jobSlug}`,
				});
			}
		}

		return {
			projects,
			dashboardUrl: "",
		};
	}
}
