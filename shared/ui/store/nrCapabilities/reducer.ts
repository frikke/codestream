import { NrCapabilitiesActionsTypes, NrCapabilitiesState } from "./types";
import { ActionType } from "../common";
import * as actions from "./actions";

type NrCapabilitiesActions = ActionType<typeof actions>;

const initialState: NrCapabilitiesState = {};

export const reduceNrCapabilities = (
	state = initialState,
	action: NrCapabilitiesActions
): NrCapabilitiesState => {
	switch (action.type) {
		case NrCapabilitiesActionsTypes.UpdateCapabilities:
			return {
				...state,
				...action.payload,
			};
		case "RESET":
			return initialState;
		default:
			return state;
	}
};
