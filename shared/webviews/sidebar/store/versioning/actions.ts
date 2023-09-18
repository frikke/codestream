import { action } from "../common";
import { VersioningActionsType } from "./types";

export const upgradeRecommended = () => action(VersioningActionsType.UpgradeRecommended);
export const upgradeRequired = () => action(VersioningActionsType.UpgradeRequired);
export const upgradeRecommendedDismissed = () => action(VersioningActionsType.Ok);
