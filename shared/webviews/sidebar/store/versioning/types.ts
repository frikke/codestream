export interface VersioningState {
	type: VersioningActionsType;
}

export enum VersioningActionsType {
	Ok = "Ok",
	UpgradeRecommended = "UpgradeRecommended",
	UpgradeRequired = "UpgradeRequired",
}
