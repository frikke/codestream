import { CSRepository } from "@codestream/protocols/api";

export interface ReposState {
	[id: string]: CSRepository;
}

export enum ReposActionsType {
	Bootstrap = "BOOTSTRAP_REPOS",
	Add = "ADD_REPOS",
}
