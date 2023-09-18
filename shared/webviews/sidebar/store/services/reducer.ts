import { ActionType } from "../common";
import * as actions from "./actions";
import { ServicesActionsType, ServicesState } from "./types";

type ServicesActions = ActionType<typeof actions>;

const initialState: ServicesState = {};

export function reduceServices(state = initialState, action: ServicesActions) {
	switch (action.type) {
		case ServicesActionsType.Bootstrap:
			return { ...action.payload, ...state };
		case "RESET":
			return initialState;
		default:
			return { ...initialState, ...state };
	}
}
