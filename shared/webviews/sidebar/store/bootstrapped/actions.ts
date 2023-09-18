import { action } from "../common";
import { BootstrapActionType } from "./types";

export const setBootstrapped = (state: boolean) =>
	action(state ? BootstrapActionType.Complete : BootstrapActionType.Start);
