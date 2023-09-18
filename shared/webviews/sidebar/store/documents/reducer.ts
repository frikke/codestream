import { ActionType } from "../common";
import * as actions from "./actions";
import { DocumentActionsType, DocumentsState } from "./types";

type DocumentAction = ActionType<typeof actions>;

const initialState: DocumentsState = {};

const updateDocument = (payload: { uri: string }, documents: DocumentsState) => {
	const document = documents[payload.uri] || {};
	return { ...document, ...payload };
};

export function reduceDocuments(state = initialState, action: DocumentAction) {
	switch (action.type) {
		case DocumentActionsType.Update: {
			return {
				...state,
				[action.payload.uri]: updateDocument(action.payload, state),
			};
		}
		case DocumentActionsType.Remove: {
			const nextState = { ...state };
			delete nextState[action.payload.uri];
			return nextState;
		}
		case "RESET_DOCUMENTS":
		case "RESET": {
			return initialState;
		}
		default:
			return state;
	}
}
