import { lspProvider } from "../system";
import { ThirdPartyBuildProviderBase } from "./thirdPartyBuildProviderBase";
import { CSJenkinsProviderInfo } from "../protocol/api.protocol.models";
import { JenkinsJobsResponse } from "./jenkins.types";

@lspProvider("jenkins")
export class JenkinsCIProvider extends ThirdPartyBuildProviderBase<CSJenkinsProviderInfo> {
	get displayName(): string {
		return "Jenkins";
	}

	get headers(): { [p: string]: string } {
		return {
			Accept: "application/json",
			Authorization: `Basic: ${this.accessToken}`,
			"Content-Type": "application/json",
		};
	}

	get name(): string {
		return "jenkins";
	}

	get baseApiUrl(): string {
		return this._providerInfo?.baseUrl || "";
	}

	async getAllJobs(): Promise<JenkinsJobsResponse | undefined> {
		const response = await this.get<JenkinsJobsResponse>(`${this.baseApiUrl}/api`);

		return {
			jobs: response?.body?.jobs,
		};
	}
}
