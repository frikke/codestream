import { CSApiCapabilities } from "@codestream/protocols/api";
import { action } from "../common";
import { ApiVersioningActionsType } from "./types";

export const apiUpgradeRecommended = (missingCapabilities: CSApiCapabilities) =>
	action(ApiVersioningActionsType.ApiUpgradeRecommended, missingCapabilities);
export const apiUpgradeRequired = () => action(ApiVersioningActionsType.ApiUpgradeRequired);
export const apiUpgradeRecommendedDismissed = () => action(ApiVersioningActionsType.ApiOk);
export const apiCapabilitiesUpdated = (capabilities: CSApiCapabilities) =>
	action(ApiVersioningActionsType.UpdateApiCapabilities, capabilities);
