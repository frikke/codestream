import { CSTeam } from "codestream-common/api-protocol";

export interface TeamsState {
	[id: string]: CSTeam;
}

export enum TeamsActionsType {
	Bootstrap = "BOOTSTRAP_TEAMS",
	Add = "ADD_TEAMS",
	Update = "UPDATE_TEAM",
}
