import { CSMePreferences } from "codestream-common/api-protocol";

export interface PreferencesState extends CSMePreferences {}

export enum PreferencesActionsType {
	Update = "UPDATE_PREFERENCES",
	Set = "SET_PREFERENCES",
}

// These represent the filters a user can save
export interface FilterQuery {
	label: string;
	q: string;
}
