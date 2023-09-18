import { CSMe } from "@codestream/protocols/api";
import { CodeStreamState } from "../../store";

export const getUserProviderInfo = (user: CSMe, provider: string, teamId: string) => {
	const providerInfo = user.providerInfo || {};
	const userProviderInfo = providerInfo[provider];
	const teamProviderInfo = providerInfo[teamId] && providerInfo[teamId][provider];
	if (userProviderInfo && userProviderInfo.accessToken) return userProviderInfo;
	else return teamProviderInfo;
};

export const getUserProviderInfoFromState = (provider: string, state: CodeStreamState) => {
	const { users, session, context } = state;
	const me = users[session.userId!] as CSMe;
	const teamId = context.currentTeamId;
	return getUserProviderInfo(me, provider, teamId);
};
