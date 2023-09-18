import { BootstrapActionType } from "./types";

export const reduceBootstrapped = (state = false, { type }) => {
	if (type === BootstrapActionType.Start) return false;
	if (type === BootstrapActionType.Complete) return true;
	return state;
};
