import { ActionType } from "../common";
import * as actions from "./actions";
import { DynamicLoggingActionsTypes, DynamicLoggingState } from "./types";

type DynamicLoggingActions = ActionType<typeof actions>;

const initialState: DynamicLoggingState = { dynamicLogs: { status: "", results: [] } };

export function reduceDynamicLogging(
	state = initialState,
	action: DynamicLoggingActions
): DynamicLoggingState {
	switch (action.type) {
		case DynamicLoggingActionsTypes.AddDynamicLogging: {
			return {
				dynamicLogs: action.payload,
			};
		}
		case DynamicLoggingActionsTypes.ClearDynamicLogging: {
			return initialState;
		}
		case "RESET":
			return initialState;
		default:
			return state;
	}
}
