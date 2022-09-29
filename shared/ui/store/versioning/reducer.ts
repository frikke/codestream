import { VersioningActionsType, VersioningState } from "./types";

const initialState: VersioningState = {
	type: VersioningActionsType.Ok,
};

export function reduceVersioning(state = initialState, { type }: VersioningState) {
	switch (type) {
		case VersioningActionsType.UpgradeRequired:
			return { ...state, type: VersioningActionsType.UpgradeRequired };
		case VersioningActionsType.UpgradeRecommended:
			return { ...state, type: VersioningActionsType.UpgradeRecommended };
		case VersioningActionsType.Ok:
			return { ...state, type: VersioningActionsType.Ok };
		default:
			return state;
	}
}
