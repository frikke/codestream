import { log, lspProvider } from "../system";
import { ThirdPartyBuildProviderBase } from "./thirdPartyBuildProviderBase";
import { CSJenkinsProviderInfo } from "../protocol/api.protocol.models";
import { ProviderConfigurationData } from "../protocol/agent.protocol.providers";

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
}
