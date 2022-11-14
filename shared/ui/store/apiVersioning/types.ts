import { CSApiCapabilities } from "codestream-common/api-protocol";

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
