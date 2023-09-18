import { toMapBy } from "../../utils";
import { ActionType } from "../common";
import * as actions from "./actions";
import { CompaniesActionsType, CompaniesState } from "./types";

type CompaniesActions = ActionType<typeof actions>;

const initialState: CompaniesState = {};

export function reduceCompanies(state = initialState, action: CompaniesActions) {
	switch (action.type) {
		case CompaniesActionsType.Bootstrap:
			return toMapBy("id", action.payload);
		case CompaniesActionsType.Update:
			return { ...state, [action.payload.id]: action.payload };
		case CompaniesActionsType.Add:
			return { ...state, ...toMapBy("id", action.payload) };
		case "RESET":
			return initialState;
		default:
			return state;
	}
}
