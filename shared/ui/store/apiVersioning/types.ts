import { CSApiCapabilities } from "@codestream/protocols/api";

export interface ApiVersioningState {
	type: ApiVersioningActionsType;
	apiCapabilities: CSApiCapabilities;
	missingCapabilities: CSApiCapabilities;
}

export enum ApiVersioningActionsType {
	ApiOk = "ApiOk",
	ApiUpgradeRecommended = "ApiUpgradeRecommended",
	ApiUpgradeRequired = "ApiUpgradeRequired",
	UpdateApiCapabilities = "UpdateApiCapabilities",
}
