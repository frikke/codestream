import { action } from "../common";
import { NrCapabilitiesActionsTypes, NrCapabilitiesState } from "./types";

export const reset = () => action("RESET");

export const updateNrCapabilities = (capabilities: NrCapabilitiesState) =>
	action(NrCapabilitiesActionsTypes.UpdateCapabilities, capabilities);
