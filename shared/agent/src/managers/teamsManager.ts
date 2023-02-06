"use strict";
import {
	FetchTeamsRequest,
	FetchTeamsRequestType,
	FetchTeamsResponse,
	GetTeamRequest,
	GetTeamRequestType,
	GetTeamResponse,
} from "@codestream/protocols/agent";
import { CSTeam } from "@codestream/protocols/api";

import { lsp, lspHandler } from "../system";
import { CachedEntityManagerBase, Id } from "./entityManager";
import { TeamsApi } from "../api/codestream/api/teamsApi";

@lsp
export class TeamsManager extends CachedEntityManagerBase<CSTeam> {
	constructor(private teamsApi: TeamsApi) {
		super();
	}

	public static inject = ["teamsApi"] as const;

	@lspHandler(FetchTeamsRequestType)
	async get(request?: FetchTeamsRequest): Promise<FetchTeamsResponse> {
		let teams = await this.getAllCached();
		if (request != null) {
			if (request.teamIds != null && request.teamIds.length !== 0) {
				teams = teams.filter(t => request.teamIds!.includes(t.id));
			}
		}

		return { teams: teams };
	}

	protected async loadCache() {
		const response = await this.teamsApi.fetchTeams({ mine: true });
		const { teams, ...rest } = response;
		this.cache.reset(teams);
		this.cacheResponse(rest);
	}

	protected async fetchById(teamId: Id): Promise<CSTeam> {
		const response = await this.teamsApi.getTeam({ teamId: teamId });
		return response.team;
	}

	@lspHandler(GetTeamRequestType)
	protected async getTeam(request: GetTeamRequest): Promise<GetTeamResponse> {
		const team = await this.getById(request.teamId);
		return { team: team };
	}

	protected getEntityName(): string {
		return "Team";
	}
}
