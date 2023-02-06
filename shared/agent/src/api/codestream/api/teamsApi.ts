import { log } from "../../../system/decorators/log";
import { FetchTeamsRequest, GetTeamRequest } from "@codestream/protocols/agent";
import { CSGetTeamResponse, CSGetTeamsResponse } from "@codestream/protocols/api";
import { ApiClient } from "./apiClient";

export class TeamsApi {
	constructor(private apiClient: ApiClient) {}

	public static inject = ["apiClient"] as const;

	@log()
	fetchTeams(request: FetchTeamsRequest) {
		let params = "";
		if (request.mine) {
			params = `&mine`;
		}

		if (request.teamIds && request.teamIds.length) {
			params += `&ids=${request.teamIds.join(",")}`;
		}

		return this.apiClient.get<CSGetTeamsResponse>(
			`/teams${params ? `?${params.substring(1)}` : ""}`,
			this.apiClient.token
		);
	}

	@log()
	getTeam(request: GetTeamRequest) {
		return this.apiClient.get<CSGetTeamResponse>(`/teams/${request.teamId}`, this.apiClient.token);
	}
}
