import { CodemarkPlus } from "codestream-common/agent-protocol";

export enum CodemarksActionsTypes {
	AddCodemarks = "ADD_CODEMARKS",
	SaveCodemarks = "SAVE_CODEMARKS",
	UpdateCodemarks = "UPDATE_CODEMARKS",
	Delete = "DELETE_CODEMARK",
}

export interface CodemarksState {
	[codemarkId: string]: CodemarkPlus;
}
