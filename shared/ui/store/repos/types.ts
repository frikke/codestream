import { CSRepository } from "codestream-common/api-protocol";

export interface ReposState {
	[id: string]: CSRepository;
}

export enum ReposActionsType {
	Bootstrap = "BOOTSTRAP_REPOS",
	Add = "ADD_REPOS",
}
