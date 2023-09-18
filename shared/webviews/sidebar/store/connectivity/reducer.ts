import { ActionType } from "../common";
import * as actions from "./actions";
import { ConnectivityActionsType, ConnectivityState } from "./types";

type ConnectivityActions = ActionType<typeof actions>;

const initialState: ConnectivityState = {
	offline: false, // !navigator.onLine
	error: undefined,
};

export function reduceConnectivity(state = initialState, action: ConnectivityActions) {
	switch (action.type) {
		case ConnectivityActionsType.Offline:
			return { ...state, offline: true, code: action.payload?.code };
		case ConnectivityActionsType.Online:
			return { ...state, offline: false };
		case ConnectivityActionsType.ErrorOccurred:
			return { ...state, error: action.payload };
		case ConnectivityActionsType.ErrorDismissed:
			return { ...state, error: undefined };
		case "RESET":
			return initialState;
		default:
			return state;
	}
}
