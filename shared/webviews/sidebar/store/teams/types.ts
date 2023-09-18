import { CSTeam } from "@codestream/protocols/api";

export interface TeamsState {
	[id: string]: CSTeam;
}

export enum TeamsActionsType {
	Bootstrap = "BOOTSTRAP_TEAMS",
	Add = "ADD_TEAMS",
	Update = "UPDATE_TEAM",
}
