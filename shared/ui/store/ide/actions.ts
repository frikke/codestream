import { action } from "../common";
import { IdeActionType, IdeState } from "./types";

export const setIde = (ide: Partial<IdeState>) =>
	action(IdeActionType.Set, {
		name: ide && ide.name ? ide.name.toUpperCase() : undefined,
	} as Partial<IdeState>);
