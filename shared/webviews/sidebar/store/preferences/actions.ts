import { action } from "../common";
import { PreferencesActionsType, PreferencesState } from "./types";

export const reset = () => action("RESET");

export const setPreferences = (preferences: Partial<PreferencesState>) =>
	action(PreferencesActionsType.Set, preferences);

export const updatePreferences = (preferences: Partial<PreferencesState>) =>
	action(PreferencesActionsType.Update, preferences);
