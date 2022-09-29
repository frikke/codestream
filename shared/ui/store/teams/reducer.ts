import {
	CSReviewApprovalSetting,
	CSReviewAssignmentSetting,
	CSTeam,
} from "@codestream/protocols/api";
import { CodeStreamState } from "..";
import { toMapBy } from "../../utils";
import { ActionType } from "../common";
import * as actions from "./actions";
import { TeamsActionsType, TeamsState } from "./types";

type TeamsActions = ActionType<typeof actions>;

const initialState: TeamsState = {};

const updateTeam = (payload: CSTeam, teams: TeamsState) => {
	const team = teams[payload.id] || {};
	return { ...team, ...payload };
};

export function reduceTeams(state = initialState, action: TeamsActions) {
	switch (action.type) {
		case TeamsActionsType.Bootstrap:
			return toMapBy("id", action.payload);
		case TeamsActionsType.Update:
			return { ...state, [action.payload.id]: updateTeam(action.payload, state) };
		case TeamsActionsType.Add:
			return { ...state, ...toMapBy("id", action.payload) };
		case "RESET":
			return initialState;
		default:
			return state;
	}
}

export function getCurrentTeamProvider(state: CodeStreamState) {
	return getTeamProvider(state.teams[state.context.currentTeamId]);
}

export function getTeamProvider(team: CSTeam): "codestream" | "slack" | "msteams" | string {
	if (team.providerInfo == null || Object.keys(team.providerInfo).length === 0) {
		return "codestream";
	}

	return Object.keys(team.providerInfo)[0];
}

const TEAM_SETTING_DEFAULTS = {
	reviewApproval: CSReviewApprovalSetting.User,
	reviewAssignment: CSReviewAssignmentSetting.Authorship2,
};

// return a team setting if it's set, otherwise return the default value
export function getTeamSetting(team: CSTeam, setting: string) {
	const { settings = {} } = team;
	return settings[setting] != undefined ? settings[setting] : TEAM_SETTING_DEFAULTS[setting];
}
