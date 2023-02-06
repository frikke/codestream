"use strict";

import { Agent as HttpsAgent } from "https";
import * as qs from "querystring";
import { ParsedUrlQueryInput } from "querystring";
import { URLSearchParams } from "url";

import { isEmpty, isEqual } from "lodash";
import { Headers } from "node-fetch";
import FormData from "form-data";
import AbortController from "abort-controller";
import { Emitter, Event } from "vscode-languageserver";
import {
	AccessToken,
	AddBlameMapRequest,
	AddBlameMapRequestType,
	AddEnterpriseProviderHostRequest,
	AddEnterpriseProviderHostResponse,
	AddMarkersResponse,
	AddReferenceLocationRequest,
	AgentOpenUrlRequestType,
	ArchiveStreamRequest,
	Capabilities,
	ChangeDataType,
	ClaimCodeErrorRequest,
	ClaimCodeErrorResponse,
	CloseStreamRequest,
	CodeStreamEnvironment,
	CreateChannelStreamRequest,
	CreateCodemarkPermalinkRequest,
	CreateCodemarkRequest,
	CreateCompanyRequest,
	CreateCompanyRequestType,
	CreateDirectStreamRequest,
	CreateExternalPostRequest,
	CreateForeignCompanyRequest,
	CreateForeignCompanyRequestType,
	CreateForeignCompanyResponse,
	CreateMarkerLocationRequest,
	CreateMarkerRequest,
	CreatePostRequest,
	CreateRepoRequest,
	CreateTeamRequest,
	CreateTeamRequestType,
	CreateTeamTagRequestType,
	DeclineInviteRequest,
	DeclineInviteResponse,
	DeleteBlameMapRequest,
	DeleteBlameMapRequestType,
	DeleteCodeErrorRequest,
	DeleteCodemarkRequest,
	DeleteCompanyRequest,
	DeleteCompanyRequestType,
	DeleteCompanyResponse,
	DeleteMarkerRequest,
	DeleteMarkerResponse,
	DeleteMeUserRequest,
	DeleteMeUserRequestType,
	DeleteMeUserResponse,
	DeletePostRequest,
	DeleteReviewRequest,
	DeleteTeamTagRequestType,
	DeleteUserRequest,
	DeleteUserResponse,
	DidChangeDataNotificationType,
	EditPostRequest,
	FetchCodeErrorsRequest,
	FetchCodeErrorsResponse,
	FetchCodemarksRequest,
	FetchCompaniesRequest,
	FetchCompaniesResponse,
	FetchFileStreamsRequest,
	FetchMarkerLocationsRequest,
	FetchMarkersRequest,
	FetchPostRepliesRequest,
	FetchPostsRequest,
	FetchReviewCheckpointDiffsRequest,
	FetchReviewCheckpointDiffsResponse,
	FetchReviewDiffsRequest,
	FetchReviewDiffsResponse,
	FetchReviewsRequest,
	FetchReviewsResponse,
	FetchStreamsRequest,
	FetchThirdPartyBuildsRequest,
	FetchThirdPartyBuildsResponse,
	FetchUnreadStreamsRequest,
	FetchUsersRequest,
	FollowCodeErrorRequest,
	FollowCodeErrorResponse,
	FollowCodemarkRequest,
	FollowCodemarkResponse,
	FollowReviewRequest,
	FollowReviewResponse,
	GenerateLoginCodeRequest,
	GetCodeErrorRequest,
	GetCodeErrorResponse,
	GetCodemarkRequest,
	GetCompanyRequest,
	GetCompanyResponse,
	GetMarkerRequest,
	GetNewRelicSignupJwtTokenRequest,
	GetNewRelicSignupJwtTokenRequestType,
	GetNewRelicSignupJwtTokenResponse,
	GetPostRequest,
	GetPostsRequest,
	GetPreferencesResponse,
	GetRepoRequest,
	GetReviewRequest,
	GetReviewResponse,
	GetStreamRequest,
	GetUnreadsRequest,
	GetUserRequest,
	InviteUserRequest,
	JoinCompanyRequest,
	JoinCompanyResponse,
	JoinStreamRequest,
	KickUserRequest,
	KickUserResponse,
	LeaveStreamRequest,
	LoginFailResponse,
	LookupNewRelicOrganizationsRequest,
	LookupNewRelicOrganizationsResponse,
	MarkItemReadRequest,
	MarkPostUnreadRequest,
	MarkStreamReadRequest,
	MatchReposRequest,
	MatchReposRequestType,
	MatchReposResponse,
	MoveMarkerResponse,
	MuteStreamRequest,
	OpenStreamRequest,
	PinReplyToCodemarkRequest,
	ProviderTokenRequest,
	ProviderTokenRequestType,
	ReactToPostRequest,
	RemoveEnterpriseProviderHostRequest,
	RenameStreamRequest,
	SendPasswordResetEmailRequest,
	SendPasswordResetEmailRequestType,
	SetCodemarkPinnedRequest,
	SetCodemarkStatusRequest,
	SetPasswordRequest,
	SetPasswordRequestType,
	SetStreamPurposeRequest,
	SharePostViaServerRequest,
	ThirdPartyProviderSetInfoRequest,
	UnarchiveStreamRequest,
	Unreads,
	UpdateCodeErrorRequest,
	UpdateCodemarkRequest,
	UpdateCompanyRequest,
	UpdateCompanyRequestType,
	UpdateCompanyResponse,
	UpdateInvisibleRequest,
	UpdateMarkerRequest,
	UpdatePostSharingDataRequest,
	UpdatePreferencesRequest,
	UpdatePresenceRequest,
	UpdateReviewRequest,
	UpdateStatusRequest,
	UpdateStreamMembershipRequest,
	UpdateTeamAdminRequest,
	UpdateTeamAdminRequestType,
	UpdateTeamRequest,
	UpdateTeamRequestType,
	UpdateTeamSettingsRequest,
	UpdateTeamSettingsRequestType,
	UpdateTeamTagRequestType,
	UpdateUserRequest,
	UploadFileRequest,
	UploadFileRequestType,
	VerifyConnectivityResponse,
} from "@codestream/protocols/agent";
import {
	CSAddMarkersRequest,
	CSAddMarkersResponse,
	CSAddProviderHostRequest,
	CSAddProviderHostResponse,
	CSAddReferenceLocationRequest,
	CSAddReferenceLocationResponse,
	CSApiCapabilities,
	CSApiFeatures,
	CSChannelStream,
	CSCodeLoginRequest,
	CSCompany,
	CSCompleteSignupRequest,
	CSConfirmRegistrationRequest,
	CSCreateChannelStreamRequest,
	CSCreateChannelStreamResponse,
	CSCreateCodemarkPermalinkRequest,
	CSCreateCodemarkPermalinkResponse,
	CSCreateCodemarkRequest,
	CSCreateCodemarkResponse,
	CSCreateDirectStreamRequest,
	CSCreateDirectStreamResponse,
	CSCreateMarkerLocationRequest,
	CSCreateMarkerLocationResponse,
	CSCreateMarkerRequest,
	CSCreateMarkerResponse,
	CSCreatePostRequest,
	CSCreatePostResponse,
	CSCreateRepoRequest,
	CSCreateRepoResponse,
	CSDeleteCodemarkResponse,
	CSDeletePostResponse,
	CSDirectStream,
	CSEditPostRequest,
	CSEditPostResponse,
	CSFileStream,
	CSGetApiCapabilitiesResponse,
	CSGetCodeErrorResponse,
	CSGetCodeErrorsResponse,
	CSGetCodemarkResponse,
	CSGetCodemarksResponse,
	CSGetCompaniesResponse,
	CSGetCompanyResponse,
	CSGetInviteInfoRequest,
	CSGetInviteInfoResponse,
	CSGetMarkerLocationsResponse,
	CSGetMarkerResponse,
	CSGetMarkersResponse,
	CSGetMeResponse,
	CSGetPostResponse,
	CSGetPostsResponse,
	CSGetRepoResponse,
	CSGetReposResponse,
	CSGetReviewCheckpointDiffsResponse,
	CSGetReviewDiffsResponse,
	CSGetReviewResponse,
	CSGetReviewsResponse,
	CSGetStreamResponse,
	CSGetStreamsResponse,
	CSGetTelemetryKeyResponse,
	CSGetUserResponse,
	CSGetUsersResponse,
	CSInviteUserRequest,
	CSInviteUserResponse,
	CSJoinStreamRequest,
	CSJoinStreamResponse,
	CSLoginRequest,
	CSLoginResponse,
	CSMarkItemReadRequest,
	CSMarkItemReadResponse,
	CSMarkPostUnreadRequest,
	CSMarkPostUnreadResponse,
	CSMe,
	CSMePreferences,
	CSMeStatus,
	CSMsTeamsConversationRequest,
	CSMsTeamsConversationResponse,
	CSNRRegisterRequest,
	CSNRRegisterResponse,
	CSObjectStream,
	CSPinReplyToCodemarkRequest,
	CSPinReplyToCodemarkResponse,
	CSPost,
	CSProviderShareRequest,
	CSProviderShareResponse,
	CSReactions,
	CSReactToPostResponse,
	CSRefreshableProviderInfos,
	CSRegisterRequest,
	CSRegisterResponse,
	CSRemoveProviderHostResponse,
	CSSetCodemarkPinnedRequest,
	CSSetCodemarkPinnedResponse,
	CSSetPasswordRequest,
	CSSetPasswordResponse,
	CSStream,
	CSTeam,
	CSTeamTagRequest,
	CSThirdPartyProviderSetInfoRequestData,
	CSTrackProviderPostRequest,
	CSUpdateCodeErrorRequest,
	CSUpdateCodeErrorResponse,
	CSUpdateCodemarkRequest,
	CSUpdateCodemarkResponse,
	CSUpdateMarkerRequest,
	CSUpdateMarkerResponse,
	CSUpdatePostSharingDataRequest,
	CSUpdatePostSharingDataResponse,
	CSUpdatePresenceRequest,
	CSUpdatePresenceResponse,
	CSUpdateReviewRequest,
	CSUpdateReviewResponse,
	CSUpdateStreamRequest,
	CSUpdateStreamResponse,
	CSUpdateUserRequest,
	CSUpdateUserResponse,
	CSUser,
	LoginResult,
	ProviderType,
	StreamType,
	TriggerMsTeamsProactiveMessageRequest,
	TriggerMsTeamsProactiveMessageResponse,
} from "@codestream/protocols/api";

import HttpsProxyAgent from "https-proxy-agent";
import { Team, User } from "../../api/extensions";
import { HistoryFetchInfo } from "../../broadcaster/broadcaster";
import { Container, SessionContainer } from "../../container";
import { Logger } from "../../logger";
import { isDirective, resolve, safeDecode, safeEncode } from "../../managers/operations";
import { NewRelicProvider } from "../../providers/newrelic";
import { getProvider, log, lsp, lspHandler, Objects } from "../../system";
import { customFetch } from "../../system/fetchCore";
import {
	ApiProvider,
	ApiProviderLoginResponse,
	CodeStreamApiMiddleware,
	LoginOptions,
	MessageType,
	RawRTMessage,
	RTMessage,
} from "../apiProvider";
import { CodeStreamPreferences } from "../preferences";
import { BroadcasterEvents } from "./events";
import { CodeStreamUnreads } from "./unreads";
import { TeamsManager } from "../../managers/teamsManager";
import { ApiClient } from "./api/apiClient";

@lsp
export class CodeStreamApiProvider implements ApiProvider {
	providerType = ProviderType.CodeStream;
	private _onDidReceiveMessage = new Emitter<RTMessage>();
	get onDidReceiveMessage(): Event<RTMessage> {
		return this._onDidReceiveMessage.event;
	}

	private _onDidSubscribe = new Emitter<void>();
	get onDidSubscribe(): Event<void> {
		return this._onDidSubscribe.event;
	}

	private _events: BroadcasterEvents | undefined;
	private readonly _middleware: CodeStreamApiMiddleware[] = [];
	private _pubnubSubscribeKey: string | undefined;
	private _broadcasterToken: string | undefined;
	private _socketCluster: { host: string; port: string; ignoreHttps?: boolean } | undefined;
	private _subscribedMessageTypes: Set<MessageType> | undefined;
	private _teamId: string | undefined;
	private _team: CSTeam | undefined;
	private _unreads: CodeStreamUnreads | undefined;
	private _userId: string | undefined;
	private _preferences: CodeStreamPreferences | undefined;
	private _features: CSApiFeatures | undefined;
	private _messageProcessingPromise: Promise<void> | undefined;

	readonly capabilities: Capabilities = {
		channelMute: true,
		postDelete: true,
		postEdit: true,
		providerCanSupportRealtimeChat: true,
		providerSupportsRealtimeChat: true,
		providerSupportsRealtimeEvents: true,
	};

	constructor(private apiClient: ApiClient, private teamsManager: TeamsManager) {}

	public static inject = ["apiClient", "teamsManager"] as const;

	get teamId(): string {
		return this._teamId!;
	}

	get team(): CSTeam | undefined {
		return this._team!;
	}

	get userId(): string {
		return this._userId!;
	}

	get features() {
		return this._features;
	}

	async dispose() {
		if (this._events) {
			await this._events.dispose();
		}
	}

	async login(options: LoginOptions): Promise<ApiProviderLoginResponse> {
		let response;
		switch (options.type) {
			case "credentials":
				response = await this.apiClient.put<CSLoginRequest, CSLoginResponse>("/no-auth/login", {
					email: options.email,
					password: options.password,
				});
				// Set the provider to be codestream since that is all that is supported for email/password login
				response.provider = "codestream";

				break;

			case "otc":
				const nrAccountId =
					options.errorGroupGuid !== undefined
						? NewRelicProvider.parseId(options.errorGroupGuid)?.accountId
						: undefined;
				response = await this.apiClient.put<CSCompleteSignupRequest, CSLoginResponse>(
					"/no-auth/check-signup",
					{
						token: options.code,
						nrAccountId,
					}
				);

				break;

			case "token":
				if (options.token.url.trim() !== this.apiClient.baseUrl) {
					throw new Error(
						`Invalid token, options.token.url="${options.token.url}" this.apiClient.baseUrl="${this.apiClient.baseUrl}"`
					);
				}

				response = await this.apiClient.put<{}, CSLoginResponse>("/login", {}, options.token.value);

				response.provider = options.token.provider;
				response.providerAccess = options.token.providerAccess;
				response.teamId = options.token.teamId;

				break;

			case "loginCode":
				response = await this.apiClient.put<CSCodeLoginRequest, CSLoginResponse>(
					"/no-auth/login-by-code",
					{
						email: options.email,
						loginCode: options.code,
					}
				);

				break;
			default:
				throw new Error("Invalid login options");
		}

		const provider = response.provider;

		Logger.log(
			`CodeStream user '${response.user.username}' (${response.user.id}) is logging into ${
				provider || "unknown"
			}${response.providerAccess ? `:${response.providerAccess}` : ""} and belongs to ${
				response.teams.length
			} team(s)\n${response.teams.map(t => `\t${t.name} (${t.id})`).join("\n")}`
		);

		/*
			💩: the session needs the accessToken token in order to rectify the user's account state
		*/
		if (response.user.mustSetPassword) {
			// save the accessToken for the call to set password
			this.apiClient.token = response.accessToken;
			throw {
				error: LoginResult.MustSetPassword,
				extra: { email: response.user.email },
			} as LoginFailResponse;
		}

		// 💩see above
		if (response.companies.length === 0 || response.teams.length === 0) {
			// save the accessToken for the call to create a team
			this.apiClient.token = response.accessToken;

			throw {
				error: LoginResult.NotInCompany,
				extra: {
					token: response.accessToken,
					email: response.user.email,
					userId: response.user.id,
					eligibleJoinCompanies: response.user.eligibleJoinCompanies,
					accountIsConnected: response.accountIsConnected,
					isWebmail: response.isWebmail,
					// isRegistered and user object passed for early segment identify call
					isRegistered: response.user.isRegistered,
					user: response.user,
				},
			} as LoginFailResponse;
		}

		// 💩see above
		//if (response.teams.length === 0) {
		//	// save the accessToken for the call to create a team
		//	this.apiClient.token = response.accessToken;
		//	throw {
		//		error: LoginResult.NotOnTeam,
		//		extra: { token: response.accessToken, email: response.user.email, userId: response.user.id }
		//	} as LoginFailResponse;
		//}

		let pickedTeamReason;
		let team: CSTeam | undefined;
		let teams = response.teams.filter(_ => _.isEveryoneTeam);
		if (!teams.length) {
			// allow non-everyone team
			teams = response.teams;
		}

		/*
		NOTE - slack/msteams login, where the user is assigned to a team by the server, is deprecated
			github login is treated like a normal login, but without providing password

		// If we are a slack/msteams team or have no overrides, then use the response teamId directly
		if (
			provider != null &&
			(provider !== "codestream" ||
				(options.team == null && (options.teamId == null || options.teamId === response.teamId)))
		) {
			const teamId = response.teamId;
			team = teams.find(t => t.id === teamId);

			if (team != null) {
				pickedTeamReason = " because the team was associated with the authentication token";
			} else {
				// If we can't find the team, make sure to filter to only teams that match the current provider
				teams = response.teams.filter(t => Team.isProvider(t, provider));
			}
		}
		*/

		if (team == null) {
			// If there is only 1 team, use it regardless of config
			if (teams.length === 1) {
				options.teamId = teams[0].id;
			} else {
				// Sort the teams from oldest to newest
				teams.sort((a, b) => a.createdAt - b.createdAt);
			}

			if (options.teamId == null) {
				if (options.team) {
					const normalizedTeamName = options.team.toLocaleUpperCase();
					const team = teams.find(t => t.name.toLocaleUpperCase() === normalizedTeamName);
					if (team != null) {
						options.teamId = team.id;
						pickedTeamReason =
							" because the team was saved in settings (user, workspace, or folder)";
					}
				}

				// Check the lastTeamId preference and use that, if available.
				// If we still can't find a team, then just pick the first one
				if (options.teamId == null) {
					if (response.user.preferences?.lastTeamId) {
						options.teamId = response.user.preferences.lastTeamId;
						pickedTeamReason = " because the team was the last saved team";
					}

					// Pick the oldest (first) Slack team if there is one
					if (options.teamId == null && User.isSlack(response.user)) {
						const team = teams.find(t => Team.isSlack(t));
						if (team) {
							options.teamId = team.id;
							pickedTeamReason = " because the team was the oldest Slack team";
						}
					}

					// Pick the oldest (first) MS Teams team if there is one
					if (options.teamId == null && User.isMSTeams(response.user)) {
						const team = teams.find(t => Team.isMSTeams(t));
						if (team) {
							options.teamId = team.id;
							pickedTeamReason = " because the team was the oldest Microsoft Teams team";
						}
					}

					if (options.teamId == null) {
						options.teamId = teams[0].id;
						pickedTeamReason = " because the team was the oldest team";
					}
				}
			} else {
				pickedTeamReason = " because the team was the last used team";
			}

			team = teams.find(t => t.id === options.teamId);
			if (team === undefined) {
				team = teams[0];
				pickedTeamReason =
					" because the specified team could not be found, defaulting to the oldest team";
			}
		}

		Logger.log(`Using team '${team.name}' (${team.id})${pickedTeamReason || ""}`);

		this.apiClient.token = response.accessToken;
		this._pubnubSubscribeKey = response.pubnubKey;
		this._broadcasterToken = response.broadcasterToken || response.pubnubToken;
		this._socketCluster = response.socketCluster;

		this._teamId = team.id;
		this._team = team;
		this._userId = response.user.id;
		this._features = response.features;

		const token: AccessToken = {
			email: response.user.email,
			url: this.apiClient.baseUrl,
			value: response.accessToken,
			provider: response.provider,
			providerAccess: response.providerAccess,
			teamId: team.id,
		};

		return { ...response, token: token };
	}

	async generateLoginCode(request: GenerateLoginCodeRequest): Promise<void> {
		await this.apiClient.post<GenerateLoginCodeRequest, {}>(
			"/no-auth/generate-login-code",
			request
		);
	}

	async register(request: CSRegisterRequest) {
		if (this.apiClient.version.machine?.machineId) {
			request.machineId = this.apiClient.version.machine.machineId;
		}
		const response = await this.apiClient.post<
			CSRegisterRequest,
			CSRegisterResponse | CSLoginResponse
		>("/no-auth/register", request);
		if ((response as CSLoginResponse).accessToken) {
			this.apiClient.token = (response as CSLoginResponse).accessToken;
		}
		return response;
	}

	async registerNr(request: CSNRRegisterRequest) {
		const response = await this.apiClient.post<CSNRRegisterRequest, CSNRRegisterResponse>(
			"/no-auth/nr-register",
			request
		);
		if (response.accessToken) {
			this.apiClient.token = response.accessToken;
		}
		return response;
	}

	async confirmRegistration(request: CSConfirmRegistrationRequest): Promise<CSLoginResponse> {
		if (request.errorGroupGuid !== undefined && request.nrAccountId === undefined) {
			request.nrAccountId = NewRelicProvider.parseId(request.errorGroupGuid)?.accountId;
		}
		const response = await this.apiClient.post<CSConfirmRegistrationRequest, CSLoginResponse>(
			"/no-auth/confirm",
			request
		);
		this.apiClient.token = response.accessToken;
		return response;
	}

	getInviteInfo(request: CSGetInviteInfoRequest) {
		return this.apiClient.get<CSGetInviteInfoResponse>(`/no-auth/invite-info?code=${request.code}`);
	}

	@log()
	async subscribe(types?: MessageType[]) {
		this._subscribedMessageTypes = types !== undefined ? new Set(types) : undefined;

		const { session, users } = SessionContainer.instance();
		const me = await users.getMe();
		if (types === undefined || types.includes(MessageType.Unreads)) {
			this._unreads = new CodeStreamUnreads(this);
			this._unreads.onDidChange(this.onUnreadsChanged, this);
			this._unreads.compute(me.lastReads, me.lastReadItems);
		}
		if (types === undefined || types.includes(MessageType.Preferences)) {
			this._preferences = new CodeStreamPreferences(me.preferences);
			this._preferences.onDidChange(preferences => {
				this._onDidReceiveMessage.fire({ type: MessageType.Preferences, data: preferences });
			});
		}

		// we only need httpsAgent for PubNub, in which case it should always be https
		const httpsAgent =
			this.apiClient.httpsAgent instanceof HttpsAgent ||
			this.apiClient.httpsAgent instanceof HttpsProxyAgent
				? this.apiClient.httpsAgent
				: undefined;
		this._events = new BroadcasterEvents({
			accessToken: this.apiClient.token!,
			pubnubSubscribeKey: this._pubnubSubscribeKey,
			broadcasterToken: this._broadcasterToken!,
			api: this,
			httpsAgent,
			strictSSL: this.apiClient.strictSSL,
			socketCluster: this._socketCluster,
			supportsEcho: session.isOnPrem && (!!session.apiCapabilities.echoes || false),
		});
		this._events.onDidReceiveMessage(this.onPubnubMessageReceivedWithBlocking, this);

		/* No longer need to subscribe to streams
		if (types === undefined || types.includes(MessageType.Streams)) {
			const streams = (await SessionContainer.instance().streams.getSubscribable(this.teamId))
				.streams;
			await this._events.connect(streams.map(s => s.id));
		} else {
			await this._events.connect();
		}
		*/
		await this._events.connect();

		this._onDidSubscribe.fire();
	}

	private async onPubnubMessageReceivedWithBlocking(e: RawRTMessage) {
		// allow for certain message types that need to be processed with higher priority than others
		if (this._messageProcessingPromise) {
			// wait for higher priority messages
			await this._messageProcessingPromise;
		}
		if (e.blockUntilProcessed) {
			// make other message processing wait
			this._messageProcessingPromise = new Promise<void>(async (resolve, reject) => {
				try {
					await this.onPubnubMessageReceived(e);
				} catch (error) {
					reject(error);
					delete this._messageProcessingPromise;
					return;
				}
				resolve();
				delete this._messageProcessingPromise;
			});
		} else {
			this.onPubnubMessageReceived(e);
		}
	}

	private async onPubnubMessageReceived(e: RawRTMessage) {
		if (this._subscribedMessageTypes !== undefined && !this._subscribedMessageTypes.has(e.type)) {
			return;
		}

		// Resolve any directives in the message data
		switch (e.type) {
			case MessageType.Codemarks:
				e.data = await SessionContainer.instance().codemarks.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				break;
			case MessageType.Companies: {
				const { companies } = SessionContainer.instance();
				e.data = await companies.resolve(e);
				if (e.data == null || e.data.length === 0) return;
				break;
			}
			case MessageType.MarkerLocations:
				e.data = await SessionContainer.instance().markerLocations.resolve(e, {
					onlyIfNeeded: false,
				});
				if (e.data == null || e.data.length === 0) return;

				break;
			case MessageType.Markers:
				e.data = await SessionContainer.instance().markers.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				break;
			case MessageType.Posts:
				const ids = (e.data as CSPost[]).map(o => o.id);
				const oldPosts = await Promise.all(
					ids.map(async id => {
						const post = await SessionContainer.instance().posts.getByIdFromCache(id);
						return post ? ({ ...post } as CSPost) : undefined;
					})
				);
				e.data = await SessionContainer.instance().posts.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				if (this._unreads !== undefined) {
					this._unreads.update(e.data as CSPost[], oldPosts);
				}

				await this.fetchAndStoreUnknownAuthors(e.data as CSPost[]);

				break;
			case MessageType.Repositories:
				e.data = await SessionContainer.instance().repos.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				break;
			case MessageType.Reviews: {
				e.data = await SessionContainer.instance().reviews.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;
				break;
			}
			case MessageType.CodeErrors: {
				e.data = await SessionContainer.instance().codeErrors.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				/*
				if (this._events !== undefined) {
					for (const codeError of e.data as CSCodeError[]) {
						this._events.subscribeToObject(codeError.id);
					}
				}
				*/

				break;
			}
			case MessageType.Streams:
				e.data = await SessionContainer.instance().streams.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				/*
				if (this._events !== undefined) {
					for (const stream of e.data as (CSChannelStream | CSDirectStream | CSObjectStream)[]) {
						if (
							CodeStreamApiProvider.isStreamSubscriptionRequired(stream, this.userId, this.teamId)
						) {
							this._events.subscribeToStream(stream.id);
						} else if (CodeStreamApiProvider.isStreamUnsubscribeRequired(stream, this.userId)) {
							this._events.unsubscribeFromStream(stream.id);
						}
					}
				}
				*/
				break;
			case MessageType.Teams:
				const { session } = SessionContainer.instance();

				let currentTeam = await this.teamsManager.getByIdFromCache(this.teamId);

				let providerHostsBefore;
				if (currentTeam && currentTeam.providerHosts) {
					providerHostsBefore = JSON.parse(JSON.stringify(currentTeam.providerHosts));
				}

				e.data = await this.teamsManager.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				// Ensure we get the updated copy
				currentTeam = await this.teamsManager.getByIdFromCache(this.teamId);

				if (currentTeam && currentTeam.providerHosts) {
					if (!isEqual(providerHostsBefore, currentTeam.providerHosts)) {
						session.updateProviders();
					}
				} else if (providerHostsBefore) {
					void session.updateProviders();
				}
				break;
			case MessageType.Users:
				const usersManager = SessionContainer.instance().users;
				const users: CSUser[] = e.data;
				const meIndex = users.findIndex(u => u.id === this.userId);

				// If we aren't updating the current user, just continue
				if (meIndex === -1) {
					e.data = await usersManager.resolve(e, { onlyIfNeeded: false });
					if (e.data != null && e.data.length !== 0) {
						// we might be getting info from other users that we need to trigger
						this._onDidReceiveMessage.fire(e as RTMessage);
					}
					return;
				}

				if (users.length > 1) {
					// Remove the current user, as we will handle that seperately
					users.splice(meIndex, 1);

					e.data = await usersManager.resolve(e, { onlyIfNeeded: false });
					if (e.data != null && e.data.length !== 0) {
						this._onDidReceiveMessage.fire(e as RTMessage);
					}

					const me = users[meIndex] as CSMe;
					e.data = [me];
				}

				let me = await usersManager.getMe();
				const lastReads = {
					...(this._unreads ? (await this._unreads.get()).lastReads : me.lastReads),
				};
				const lastReadItems = {
					...(this._unreads ? (await this._unreads.get()).lastReadItems : me.lastReadItems),
				};

				const userPreferencesBefore = JSON.stringify(me.preferences);

				e.data = await usersManager.resolve(e, {
					onlyIfNeeded: true,
				});
				if (e.data == null || e.data.length === 0) return;

				me = await usersManager.getMe();
				e.data = [me];

				try {
					if (
						this._unreads !== undefined &&
						(!Objects.shallowEquals(lastReads, me.lastReads || {}) ||
							!Objects.shallowEquals(lastReadItems, me.lastReadItems || {}))
					) {
						this._unreads.compute(me.lastReads, me.lastReadItems);
					}
					if (!this._preferences) {
						this._preferences = new CodeStreamPreferences(me.preferences);
					}
					if (me.preferences && JSON.stringify(me.preferences) !== userPreferencesBefore) {
						this._preferences.update(me.preferences);
					}
				} catch {
					debugger;
				}

				break;
		}

		this._onDidReceiveMessage.fire(e as RTMessage);
	}

	private onUnreadsChanged(e: Unreads) {
		this._onDidReceiveMessage.fire({ type: MessageType.Unreads, data: e });
	}

	grantBroadcasterChannelAccess(token: string, channel: string): Promise<{}> {
		return this.apiClient.put(`/grant/${channel}`, {}, token);
	}

	@log()
	private getMe() {
		return this.apiClient.get<CSGetMeResponse>("/users/me", this.apiClient.token);
	}

	@log()
	async getUnreads(request: GetUnreadsRequest) {
		if (this._unreads === undefined) {
			return {
				unreads: {
					lastReads: {},
					lastReadItems: {},
					mentions: {},
					unreads: {},
					totalMentions: 0,
					totalUnreads: 0,
				},
			};
		}

		return { unreads: await this._unreads!.get() };
	}

	@log()
	async trackProviderPost(request: CSTrackProviderPostRequest) {
		try {
			return await this.apiClient.post(
				`/provider-posts/${request.provider}`,
				request,
				this.apiClient.token
			);
		} catch (ex) {
			debugger;
			Logger.error(ex, `Failed updating ${request.provider} post count`);
			return undefined;
		}
	}

	@log()
	async updatePreferences(request: UpdatePreferencesRequest) {
		safeEncode(request.preferences);
		const update = await this.apiClient.put<CSMePreferences, any>(
			"/preferences",
			request.preferences,
			this.apiClient.token
		);

		const user = await SessionContainer.instance().session.resolveUserAndNotify(update.user);

		if (this._preferences) {
			this._preferences.update(user.preferences!);
		}
		return { preferences: user.preferences || {} };
	}

	@log()
	async updateStatus(request: UpdateStatusRequest) {
		let currentStatus = {};
		const me = await SessionContainer.instance().users.getMe();
		if (me.status) {
			currentStatus = {
				...me.status,
			};
		}
		const update = await this.apiClient.put<{ status: { [teamId: string]: CSMeStatus } }, any>(
			"/users/me",
			{
				status: {
					...currentStatus,
					...request.status,
				},
			},
			this.apiClient.token
		);

		const user = await SessionContainer.instance().session.resolveUserAndNotify(update.user);

		return { user };
	}

	@log()
	async updateInvisible(request: UpdateInvisibleRequest) {
		const update = await this.apiClient.put<{ status: { invisible: boolean } }, any>(
			"/users/me",
			{ status: { invisible: request.invisible } },
			this.apiClient.token
		);

		const user = await SessionContainer.instance().session.resolveUserAndNotify(update.user);
		return { user };
	}

	@log()
	updatePresence(request: UpdatePresenceRequest) {
		return this.apiClient.put<CSUpdatePresenceRequest, CSUpdatePresenceResponse>(
			`/presence`,
			request,
			this.apiClient.token
		);
	}

	// async createFileStream(relativePath: string, repoId: string) {
	// 	return this.createStream<CSCreateFileStreamRequest, CSCreateFileStreamResponse>({
	// 		teamId: this._teamId,
	// 		type: StreamType.File,
	// 		repoId: repoId,
	// 		file: relativePath
	// 	});
	// }

	@log()
	async fetchFileStreams(request: FetchFileStreamsRequest) {
		return this.getStreams<CSGetStreamsResponse<CSFileStream>>(
			`/streams?teamId=${this.teamId}&repoId=${request.repoId}`,
			this.apiClient.token
		);
	}

	private async getStreams<R extends CSGetStreamsResponse<CSStream>>(
		url: string,
		token?: string
	): Promise<R> {
		let more: boolean | undefined = true;
		let lt: string | undefined;
		const response = { streams: [] as CSStream[] };

		while (more) {
			const pagination = lt ? `&lt=${lt}` : "";
			const page = await this.apiClient.get<R>(`${url}${pagination}`, token);
			response.streams.push(...page.streams);
			more = page.more;
			lt = page.streams.length ? page.streams[page.streams.length - 1].sortId : undefined;
		}

		return response as R;
	}

	@log()
	createMarkerLocation(request: CreateMarkerLocationRequest) {
		return this.apiClient.put<CSCreateMarkerLocationRequest, CSCreateMarkerLocationResponse>(
			`/marker-locations`,
			{ ...request, teamId: this.teamId },
			this.apiClient.token
		);
	}

	@log()
	fetchMarkerLocations(request: FetchMarkerLocationsRequest) {
		return this.apiClient.get<CSGetMarkerLocationsResponse>(
			`/marker-locations?teamId=${this.teamId}&streamId=${request.streamId}&commitHash=${request.commitHash}`,
			this.apiClient.token
		);
	}

	@log()
	addReferenceLocation(request: AddReferenceLocationRequest) {
		return this.apiClient.put<CSAddReferenceLocationRequest, CSAddReferenceLocationResponse>(
			`/markers/${request.markerId}/reference-location`,
			request,
			this.apiClient.token
		);
	}

	@log()
	fetchMarkers(request: FetchMarkersRequest) {
		// TODO: This doesn't handle all the request params
		return this.apiClient.get<CSGetMarkersResponse>(
			`/markers?teamId=${this.teamId}&streamId=${request.streamId}${
				request.commitHash ? `&commitHash=${request.commitHash}` : ""
			}`,
			this.apiClient.token
		);
	}

	@log()
	getMarker(request: GetMarkerRequest) {
		return this.apiClient.get<CSGetMarkerResponse>(
			`/markers/${request.markerId}`,
			this.apiClient.token
		);
	}

	@log()
	updateMarker(request: UpdateMarkerRequest) {
		return this.apiClient.put<CSUpdateMarkerRequest, CSUpdateMarkerResponse>(
			`/markers/${request.markerId}`,
			request,
			this.apiClient.token
		);
	}

	@log()
	moveMarker(request: {
		oldMarkerId: string;
		newMarker: CreateMarkerRequest;
	}): Promise<MoveMarkerResponse> {
		return this.apiClient.put<CSCreateMarkerRequest, CSCreateMarkerResponse>(
			`/markers/${request.oldMarkerId}/move`,
			request.newMarker,
			this.apiClient.token
		);
	}

	@log()
	addMarkers(request: {
		codemarkId: string;
		newMarkers: CreateMarkerRequest[];
	}): Promise<AddMarkersResponse> {
		return this.apiClient.put<CSAddMarkersRequest, CSAddMarkersResponse>(
			`/codemarks/${request.codemarkId}/add-markers`,
			{ markers: request.newMarkers },
			this.apiClient.token
		);
	}

	@log()
	deleteMarker(request: DeleteMarkerRequest): Promise<DeleteMarkerResponse> {
		return this.apiClient.delete<{}>(`/markers/${request.markerId}`, this.apiClient.token);
	}

	@log()
	createCodemark(request: CreateCodemarkRequest) {
		return this.apiClient.post<CSCreateCodemarkRequest, CSCreateCodemarkResponse>(
			"/codemarks",
			{ ...request, teamId: this.teamId },
			this.apiClient.token
		);
	}

	@log()
	deleteCodemark(request: DeleteCodemarkRequest) {
		const { codemarkId } = request;
		return this.apiClient.delete<CSDeleteCodemarkResponse>(
			`/codemarks/${codemarkId}`,
			this.apiClient.token
		);
	}

	@log()
	fetchCodemarks(request: FetchCodemarksRequest) {
		return this.apiClient.get<CSGetCodemarksResponse>(
			`/codemarks?${qs.stringify({
				teamId: this.teamId,
				byLastAcivityAt: request.byLastAcivityAt,
			})}${request.before ? `&before=${request.before}` : ""}`,
			this.apiClient.token
		);
	}

	@log()
	getCodemark(request: GetCodemarkRequest) {
		return this.apiClient.get<CSGetCodemarkResponse>(
			`/codemarks/${request.codemarkId}?${qs.stringify({
				byLastAcivityAt: request.sortByActivity,
			})}`,
			this.apiClient.token
		);
	}

	@log()
	setCodemarkPinned(request: SetCodemarkPinnedRequest) {
		return this.apiClient.put<CSSetCodemarkPinnedRequest, CSSetCodemarkPinnedResponse>(
			`${request.value ? "/pin" : "/unpin"}/${request.codemarkId}`,
			request,
			this.apiClient.token
		);
	}

	@log()
	pinReplyToCodemark(request: PinReplyToCodemarkRequest) {
		return this.apiClient.put<CSPinReplyToCodemarkRequest, CSPinReplyToCodemarkResponse>(
			request.value ? "/pin-post" : "/unpin-post",
			request,
			this.apiClient.token
		);
	}

	@log()
	followCodemark(request: FollowCodemarkRequest) {
		const pathType = request.value ? "follow" : "unfollow";
		return this.apiClient.put<FollowCodemarkRequest, FollowCodemarkResponse>(
			`/codemarks/${pathType}/${request.codemarkId}`,
			request,
			this.apiClient.token
		);
	}

	@log()
	followReview(request: FollowReviewRequest) {
		const pathType = request.value ? "follow" : "unfollow";
		return this.apiClient.put<FollowReviewRequest, FollowReviewResponse>(
			`/reviews/${pathType}/${request.id}`,
			request,
			this.apiClient.token
		);
	}

	@log()
	followCodeError(request: FollowCodeErrorRequest) {
		const pathType = request.value ? "follow" : "unfollow";
		return this.apiClient.put<FollowCodeErrorRequest, FollowCodeErrorResponse>(
			`/code-errors/${pathType}/${request.id}`,
			request,
			this.apiClient.token
		);
	}

	@log()
	setCodemarkStatus(request: SetCodemarkStatusRequest) {
		return this.updateCodemark(request);
	}

	@log()
	async updateCodemark(request: UpdateCodemarkRequest) {
		const { codemarkId, ...attributes } = request;
		const response = await this.apiClient.put<CSUpdateCodemarkRequest, CSUpdateCodemarkResponse>(
			`/codemarks/${codemarkId}`,
			attributes,
			this.apiClient.token
		);

		const [codemark] = await SessionContainer.instance().codemarks.resolve({
			type: MessageType.Codemarks,
			data: [response.codemark],
		});

		return { codemark };
	}

	@log()
	createCodemarkPermalink(request: CreateCodemarkPermalinkRequest) {
		return this.apiClient.post<CSCreateCodemarkPermalinkRequest, CSCreateCodemarkPermalinkResponse>(
			`/codemarks/${request.codemarkId}/permalink`,
			{ isPublic: request.isPublic },
			this.apiClient.token
		);
	}

	@log()
	async createExternalPost(request: CreateExternalPostRequest): Promise<CSCreatePostResponse> {
		throw new Error("Not supported");
	}

	@log()
	createPost(request: CreatePostRequest) {
		// for on-prem, base the server url (and strict flag) into the invite code,
		// so invited users have it set automatically
		const session = SessionContainer.instance().session;
		if (session.isOnPrem) {
			request.inviteInfo = {
				serverUrl: this.apiClient.baseUrl,
				disableStrictSSL: session.disableStrictSSL ? true : false,
			};
		}

		return this.apiClient.post<CSCreatePostRequest, CSCreatePostResponse>(
			`/posts`,
			{ ...request, teamId: this.teamId },
			this.apiClient.token
		);
	}

	@log()
	async deletePost(request: DeletePostRequest) {
		const response = await this.apiClient.delete<CSDeletePostResponse>(
			`/posts/${request.postId}`,
			this.apiClient.token
		);
		const [post] = await SessionContainer.instance().posts.resolve({
			type: MessageType.Posts,
			data: response.posts,
		});
		await SessionContainer.instance().codemarks.resolve({
			type: MessageType.Codemarks,
			data: response.codemarks || [],
		});
		await SessionContainer.instance().markers.resolve({
			type: MessageType.Markers,
			data: response.markers || [],
		});

		return { ...response, post };
	}

	@log()
	async editPost(request: EditPostRequest) {
		const response = await this.apiClient.put<CSEditPostRequest, CSEditPostResponse>(
			`/posts/${request.postId}`,
			request,
			this.apiClient.token
		);
		const [post] = await SessionContainer.instance().posts.resolve({
			type: MessageType.Streams,
			data: [response.post],
		});
		return { ...response, post };
	}

	@log()
	async updatePostSharingData(request: UpdatePostSharingDataRequest) {
		const response = await this.apiClient.put<
			CSUpdatePostSharingDataRequest,
			CSUpdatePostSharingDataResponse
		>(`/posts/${request.postId}`, request, this.apiClient.token);
		const [post] = await SessionContainer.instance().posts.resolve({
			type: MessageType.Streams,
			data: [response.post],
		});
		return { ...response, post };
	}

	@log()
	async sharePostViaServer(request: SharePostViaServerRequest) {
		const provider = getProvider(request.providerId);
		if (!provider) {
			throw new Error("Invalid providerId");
		}
		try {
			const response = await this.apiClient.post<CSProviderShareRequest, CSProviderShareResponse>(
				`/provider-share/${provider.name}`,
				{
					postId: request.postId,
				},
			this.apiClient.token
			);
			const [post] = await SessionContainer.instance().posts.resolve({
				type: MessageType.Streams,
				data: [response.post],
			});
			return { ...response, post };
		} catch (ex) {
			if (provider.name === "slack") {
				const telemetry = Container.instance().telemetry;
				telemetry.track({
					eventName: "Slack Sharing Error",
					properties: {
						Error: ex.message,
					},
				});
			}
			throw ex;
		}
	}

	@log()
	async fetchPostReplies(request: FetchPostRepliesRequest) {
		const post = await SessionContainer.instance().posts.getById(request.postId);
		const response = await this.apiClient.get<CSGetPostsResponse>(
			`/posts?teamId=${this.teamId}&streamId=${request.streamId}&parentPostId=${request.postId}`,
			this.apiClient.token
		);

		// when fetching replies to code errors, we may end up with authors that aren't part of the
		// current team, we'll need to fetch and store those authors
		await this.fetchAndStoreUnknownAuthors(response.posts);

		return response;
	}

	@log()
	async fetchPosts(request: FetchPostsRequest | Partial<FetchPostsRequest>) {
		let limit = request.limit;
		if (!limit || limit > 100) {
			limit = 100;
		}

		const params: { [k: string]: any } = {
			teamId: this.teamId,
			limit,
		};

		if (request.streamId) {
			params.streamId = request.streamId;
		}
		if (request.before) {
			params.before = request.before;
		}
		if (request.after) {
			params.after = request.after;
		}
		if (request.inclusive === true) {
			params.inclusive = request.inclusive;
		}

		const response = await this.apiClient.get<CSGetPostsResponse>(
			`/posts?${qs.stringify(params)}`,
			this.apiClient.token
		);

		if (response.posts && request.streamId) {
			response.posts.sort((a: CSPost, b: CSPost) => (a.seqNum as number) - (b.seqNum as number));
		}

		/*
		(response.codeErrors || []).forEach(codeError => {
			this._events?.subscribeToObject(codeError.id);
		});
		*/

		await this.fetchAndStoreUnknownAuthors(response.posts);

		return response;
	}

	@log()
	async fetchAndStoreUnknownAuthors(posts: CSPost[]) {
		const unknownAuthorIds: string[] = [];
		for (const post of posts) {
			if (
				!unknownAuthorIds.includes(post.creatorId) &&
				!(await SessionContainer.instance().users.getByIdFromCache(post.creatorId))
			) {
				unknownAuthorIds.push(post.creatorId);
			}
		}

		if (unknownAuthorIds.length > 0) {
			const request: FetchUsersRequest = {
				userIds: unknownAuthorIds,
			};
			const usersResponse = await this.fetchUsers(request);
			await SessionContainer.instance().users.resolve({
				type: MessageType.Users,
				data: usersResponse.users,
			});
			Container.instance().agent.sendNotification(DidChangeDataNotificationType, {
				type: ChangeDataType.Users,
				data: usersResponse.users,
			});
		}
	}

	@log()
	getPost(request: GetPostRequest) {
		return this.apiClient.get<CSGetPostResponse>(
			`/posts/${request.postId}?teamId=${this.teamId}`,
			this.apiClient.token
		);
	}

	@log()
	getPosts(request: GetPostsRequest) {
		return this.apiClient.get<CSGetPostsResponse>(
			`/posts?${qs.stringify({
				teamId: this.teamId,
				streamId: request.streamId,
				ids: request.postIds && request.postIds.join(","),
			})}`,
			this.apiClient.token
		);
	}

	@log()
	markPostUnread(request: MarkPostUnreadRequest) {
		return this.apiClient.put<CSMarkPostUnreadRequest, CSMarkPostUnreadResponse>(
			`/unread/${request.postId}`,
			request,
			this.apiClient.token
		);
	}

	@log()
	markItemRead(request: MarkItemReadRequest) {
		return this.apiClient.put<CSMarkItemReadRequest, CSMarkItemReadResponse>(
			`/read-item/${request.itemId}`,
			{ numReplies: request.numReplies },
			this.apiClient.token
		);
	}

	@log()
	async reactToPost(request: ReactToPostRequest) {
		const response = await this.apiClient.put<CSReactions, CSReactToPostResponse>(
			`/react/${request.postId}`,
			request.emojis,
			this.apiClient.token
		);

		const [post] = await SessionContainer.instance().posts.resolve({
			type: MessageType.Posts,
			data: [response.post],
		});
		return { ...response, post: post };
	}

	@log()
	createRepo(request: CreateRepoRequest) {
		return this.apiClient.post<CSCreateRepoRequest, CSCreateRepoResponse>(
			`/repos`,
			{ ...request, teamId: this.teamId },
			this.apiClient.token
		);
	}

	@log()
	fetchRepos() {
		return this.apiClient.get<CSGetReposResponse>(
			`/repos?teamId=${this.teamId}`,
			this.apiClient.token
		);
	}

	fetchMsTeamsConversations(
		request: CSMsTeamsConversationRequest
	): Promise<CSMsTeamsConversationResponse> {
		return this.apiClient.get<any>(
			`/msteams_conversations?teamId=${this.teamId}&tenantId=${request.tenantId}`,
			this.apiClient.token
		);
	}

	triggerMsTeamsProactiveMessage(
		request: TriggerMsTeamsProactiveMessageRequest
	): Promise<TriggerMsTeamsProactiveMessageResponse> {
		return this.apiClient.post<any, any>(
			"/msteams_conversations",
			{ ...request, teamId: this.teamId },
			this.apiClient.token
		);
	}

	@log()
	getRepo(request: GetRepoRequest) {
		return this.apiClient.get<CSGetRepoResponse>(`/repos/${request.repoId}`, this.apiClient.token);
	}

	@log()
	async matchRepos(request: MatchReposRequest) {
		const response = await this.apiClient.put<MatchReposRequest, MatchReposResponse>(
			`/repos/match/${this.teamId}`,
			request,
			this.apiClient.token
		);
		await SessionContainer.instance().repos.resolve({
			type: MessageType.Repositories,
			data: [response.repos],
		});
		return response;
	}

	@lspHandler(MatchReposRequestType)
	@log()
	async matchRepo(request: MatchReposRequest) {
		return this.apiClient.get<MatchReposResponse>(
			`/repos/match/${this.teamId}?repos=${encodeURIComponent(JSON.stringify(request))}`,
			this.apiClient.token
		);
	}

	@log()
	fetchReviews(request: FetchReviewsRequest): Promise<FetchReviewsResponse> {
		const params: ParsedUrlQueryInput = {
			teamId: this.teamId,
		};
		if (request.reviewIds?.length ?? 0 > 0) {
			params.ids = request.reviewIds;
		}
		if (request.streamId != null) {
			params.streamId = request.streamId;
		}

		return this.apiClient.get<CSGetReviewsResponse>(
			`/reviews?${qs.stringify(params)}`,
			this.apiClient.token
		);
	}

	@log()
	async fetchCodeErrors(request: FetchCodeErrorsRequest): Promise<FetchCodeErrorsResponse> {
		const params: ParsedUrlQueryInput = {
			teamId: this.teamId,
		};
		if (request.codeErrorIds?.length ?? 0 > 0) {
			params.ids = request.codeErrorIds;
		}
		/* The need to pass streamId or streamIds is deprecated
		if (request.streamIds != null) {
			params.streamIds = request.streamIds;
		}
		*/
		const response = await this.apiClient.get<CSGetCodeErrorsResponse>(
			`/code-errors?${qs.stringify(params)}`,
			this.apiClient.token
		);

		/*
		(response.codeErrors || []).forEach(codeError => {
			this._events?.subscribeToObject(codeError.id);
		});
		*/

		return response;
	}

	@log()
	async claimCodeError(request: ClaimCodeErrorRequest): Promise<ClaimCodeErrorResponse> {
		const response = await this.apiClient.post<ClaimCodeErrorRequest, ClaimCodeErrorResponse>(
			`/code-errors/claim/${this.teamId}`,
			{
				objectId: request.objectId,
				objectType: request.objectType,
			},
			this.apiClient.token
		);
		Logger.log(`Response to claim code error, objectId=${request.objectId}:`, response);
		return response;
	}

	@log()
	getReview(request: GetReviewRequest): Promise<GetReviewResponse> {
		return this.apiClient.get<CSGetReviewResponse>(
			`/reviews/${request.reviewId}`,
			this.apiClient.token
		);
	}

	@log()
	getCodeError(request: GetCodeErrorRequest): Promise<GetCodeErrorResponse> {
		return this.apiClient.get<CSGetCodeErrorResponse>(
			`/code-errors/${request.codeErrorId}`,
			this.apiClient.token
		);
	}

	@log()
	updateReview(request: UpdateReviewRequest) {
		const { id, ...params } = request;

		const capabilities = SessionContainer.instance().session.apiCapabilities;

		// check to see if we're setting the status of the review,
		// and if so, use the specialized API calls
		if (capabilities && capabilities.multipleReviewersApprove && params.status) {
			const routeMap: { [key: string]: string } = {
				approved: "/approve",
				rejected: "/reject",
				open: "/reopen",
			} as any;
			const route = routeMap[params.status];
			if (route) {
				return this.apiClient.put<CSUpdateReviewRequest, CSUpdateReviewResponse>(
					`/reviews${route}/${id}`,
					{},
					this.apiClient.token
				);
			} else {
				Logger.warn("Unknown route for status: ", params);
			}
		}

		return this.apiClient.put<CSUpdateReviewRequest, CSUpdateReviewResponse>(
			`/reviews/${id}`,
			params,
			this.apiClient.token
		);
	}

	@log()
	updateCodeError(request: UpdateCodeErrorRequest) {
		const { id, ...params } = request;
		return this.apiClient.put<CSUpdateCodeErrorRequest, CSUpdateCodeErrorResponse>(
			`/code-errors/${id}`,
			params,
			this.apiClient.token
		);
	}

	@log()
	async deleteReview(request: DeleteReviewRequest) {
		await this.apiClient.delete(`/reviews/${request.id}`, this.apiClient.token);
		return {};
	}

	@log()
	async deleteCodeError(request: DeleteCodeErrorRequest) {
		await this.apiClient.delete(`/code-errors/${request.id}`, this.apiClient.token);
		return {};
	}

	@log()
	fetchReviewDiffs(request: FetchReviewDiffsRequest): Promise<FetchReviewDiffsResponse> {
		return this.apiClient.get<CSGetReviewDiffsResponse>(
			`/reviews/diffs/${request.reviewId}`,
			this.apiClient.token
		);
	}

	@log()
	fetchReviewCheckpointDiffs(
		request: FetchReviewCheckpointDiffsRequest
	): Promise<FetchReviewCheckpointDiffsResponse> {
		return this.apiClient.get<CSGetReviewCheckpointDiffsResponse>(
			`/reviews/checkpoint-diffs/${request.reviewId}`,
			this.apiClient.token
		);
	}

	@log()
	createChannelStream(request: CreateChannelStreamRequest) {
		return this.apiClient.post<CSCreateChannelStreamRequest, CSCreateChannelStreamResponse>(
			`/streams`,
			{ ...request, teamId: this.teamId },
			this.apiClient.token
		);
	}

	@log()
	createDirectStream(request: CreateDirectStreamRequest) {
		return this.apiClient.post<CSCreateDirectStreamRequest, CSCreateDirectStreamResponse>(
			`/streams`,
			{ ...request, teamId: this.teamId },
			this.apiClient.token
		);
	}

	@log()
	fetchStreams(request: FetchStreamsRequest) {
		if (
			request.types == null ||
			request.types.length === 0 ||
			(request.types.includes(StreamType.Channel) && request.types.includes(StreamType.Direct))
		) {
			return this.getStreams<
				CSGetStreamsResponse<CSChannelStream | CSDirectStream | CSObjectStream>
			>(`/streams?teamId=${this.teamId}`, this.apiClient.token);
		}

		return this.getStreams<CSGetStreamsResponse<CSChannelStream | CSDirectStream | CSObjectStream>>(
			`/streams?teamId=${this.teamId}&type=${request.types[0]}`,
			this.apiClient.token
		);
	}

	@log()
	fetchUnreadStreams(request: FetchUnreadStreamsRequest) {
		return this.getStreams<CSGetStreamsResponse<CSChannelStream | CSDirectStream | CSObjectStream>>(
			`/streams?teamId=${this.teamId}&unread`,
			this.apiClient.token
		);
	}

	@log()
	async getStream(request: GetStreamRequest) {
		return this.apiClient.get<
			CSGetStreamResponse<CSChannelStream | CSDirectStream | CSObjectStream>
		>(`/streams/${request.streamId}`, this.apiClient.token);
	}

	@log()
	async archiveStream(request: ArchiveStreamRequest) {
		return this.updateStream<CSChannelStream>(request.streamId, { isArchived: true });
	}

	@log()
	closeStream(request: CloseStreamRequest) {
		return this.updateStream<CSDirectStream>(request.streamId, { isClosed: true });
	}

	@log()
	async joinStream(request: JoinStreamRequest) {
		const response = await this.apiClient.put<CSJoinStreamRequest, CSJoinStreamResponse>(
			`/join/${request.streamId}`,
			{},
			this.apiClient.token
		);

		const [stream] = await SessionContainer.instance().streams.resolve({
			type: MessageType.Streams,
			data: [response.stream],
		});

		return { stream: stream as CSChannelStream };
	}

	@log()
	async leaveStream(request: LeaveStreamRequest) {
		// Get a copy of the original stream & copy its membership array (since it will be mutated)
		const originalStream = {
			...(await SessionContainer.instance().streams.getById(request.streamId)),
		};
		if (originalStream.memberIds != null) {
			originalStream.memberIds = originalStream.memberIds.slice(0);
		}

		if (this._events !== undefined) {
			this._events.unsubscribeFromStream(request.streamId);
		}

		try {
			const response = await this.updateStream(request.streamId, {
				$pull: { memberIds: [this._userId] },
			});
			return { stream: response.stream as CSChannelStream };
		} catch (ex) {
			Logger.error(ex);

			// Since this can happen because we have no permission to the stream anymore,
			// simulate removing ourselves from the membership list
			if (originalStream.memberIds != null) {
				const index = originalStream.memberIds.findIndex(m => m === this._userId);
				if (index !== -1) {
					originalStream.memberIds.splice(index, 1);
				}
			}
			return { stream: originalStream as CSChannelStream };
		}
	}

	@log()
	markStreamRead(request: MarkStreamReadRequest) {
		return this.apiClient.put(`/read/${request.streamId}`, {}, this.apiClient.token);
	}

	@log()
	async muteStream(request: MuteStreamRequest) {
		void (await this.updatePreferences({
			preferences: {
				$set: { [`mutedStreams.${request.streamId}`]: request.mute },
			},
		}));

		const stream = await SessionContainer.instance().streams.getById(request.streamId);
		return { stream: stream };
	}

	@log()
	openStream(request: OpenStreamRequest) {
		return this.updateStream<CSDirectStream>(request.streamId, { isClosed: false });
	}

	@log()
	renameStream(request: RenameStreamRequest) {
		return this.updateStream<CSChannelStream>(request.streamId, { name: request.name });
	}

	@log()
	setStreamPurpose(request: SetStreamPurposeRequest) {
		return this.updateStream<CSChannelStream>(request.streamId, { purpose: request.purpose });
	}

	@log()
	unarchiveStream(request: UnarchiveStreamRequest) {
		return this.updateStream<CSChannelStream>(request.streamId, { isArchived: false });
	}

	private async updateStream<T extends CSChannelStream | CSDirectStream | CSObjectStream>(
		streamId: string,
		changes: { [key: string]: any }
	) {
		const response = await this.apiClient.put<CSUpdateStreamRequest, CSUpdateStreamResponse>(
			`/streams/${streamId}`,
			{
				...changes,
			},
			this.apiClient.token
		);

		const [stream] = await SessionContainer.instance().streams.resolve({
			type: MessageType.Streams,
			data: [response.stream],
		});

		return { stream: stream as T };
	}

	@log()
	async updateStreamMembership(request: UpdateStreamMembershipRequest) {
		const response = await this.apiClient.put<CSUpdateStreamRequest, CSUpdateStreamResponse>(
			`/streams/${request.streamId}`,
			{
				$push: request.add == null ? undefined : { memberIds: request.add },
				$pull: request.remove == null ? undefined : { memberIds: request.remove },
			},
			this.apiClient.token
		);

		const [stream] = await SessionContainer.instance().streams.resolve({
			type: MessageType.Streams,
			data: [response.stream],
		});

		return { stream: stream as CSChannelStream };
	}

	@log()
	@lspHandler(CreateTeamRequestType)
	createTeam(request: CreateTeamRequest) {
		return this.apiClient.post("/teams", request, this.apiClient.token);
	}

	@lspHandler(SendPasswordResetEmailRequestType)
	async sendPasswordResetEmail(request: SendPasswordResetEmailRequest) {
		await this.apiClient.put("/no-auth/forgot-password", request);
	}

	@lspHandler(SetPasswordRequestType)
	async setPassword(request: SetPasswordRequest) {
		return this.apiClient.put<CSSetPasswordRequest, CSSetPasswordResponse>(
			"/password",
			{ newPassword: request.password },
			this.apiClient.token
		);
	}

	fetchCompanies(request: FetchCompaniesRequest): Promise<FetchCompaniesResponse> {
		const params: { [k: string]: any } = {};

		if (request.mine) {
			params.mine = true;
		} else if (request.companyIds?.length ?? 0 > 0) {
			params.ids = request.companyIds!.join(",");
		}

		return this.apiClient.get<CSGetCompaniesResponse>(
			`/companies?${qs.stringify(params)}`,
			this.apiClient.token
		);
	}

	getCompany(request: GetCompanyRequest): Promise<GetCompanyResponse> {
		return this.apiClient.get<CSGetCompanyResponse>(
			`/companies/${request.companyId}`,
			this.apiClient.token
		);
	}

	async joinCompany(request: JoinCompanyRequest): Promise<JoinCompanyResponse> {
		return this.apiClient.put(`/join-company/${request.companyId}`, {}, this.apiClient.token);
	}

	async declineInvite(request: DeclineInviteRequest): Promise<DeclineInviteResponse> {
		return this.apiClient.put(`/decline-invite/${request.companyId}`, {}, this.apiClient.token);
	}

	async joinCompanyFromEnvironment(request: JoinCompanyRequest): Promise<JoinCompanyResponse> {
		const { serverUrl, userId, toServerUrl } = request.fromEnvironment!;

		// explicitly set the host to call, because even though we're switching, the
		// switch may not have fully sync'd yet
		this.apiClient.setServerUrl(toServerUrl);

		// NOTE that this.apiClient.token here is the access token for the server we are switching FROM,
		// this is OK, since in this request, the access token actually gets passed on to the
		// server we are switching FROM, by the server we are switching TO
		// isn't this awesome???
		const xenvRequest = {
			serverUrl,
			userId,
		};

		return this.apiClient.put(
			`/xenv/join-company/${request.companyId}`,
			xenvRequest,
			this.apiClient.token
		);
	}

	@lspHandler(UpdateCompanyRequestType)
	@log()
	async updateCompany(request: UpdateCompanyRequest): Promise<UpdateCompanyResponse> {
		return this.apiClient.put(`/companies/${request.companyId}`, request, this.apiClient.token);
	}

	@lspHandler(DeleteCompanyRequestType)
	@log()
	deleteCompany(request: DeleteCompanyRequest): Promise<DeleteCompanyResponse> {
		return this.apiClient.delete<DeleteCompanyResponse>(
			`/companies/${request.companyId}`,
			this.apiClient.token
		);
	}

	async setCompanyTestGroups(
		companyId: string,
		request: { [key: string]: string }
	): Promise<CSCompany> {
		const response = await this.apiClient.put<{ [key: string]: string }, { company: any }>(
			`/company-test-group/${companyId}`,
			request,
			this.apiClient.token
		);
		const companies = (await SessionContainer.instance().companies.resolve({
			type: MessageType.Companies,
			data: [response.company],
		})) as CSCompany[];
		return companies[0];
	}

	async addCompanyNewRelicInfo(companyId: string, accountIds?: number[], orgIds?: number[]) {
		if (!accountIds && !orgIds) {
			return false;
		}

		const body: {
			accountIds?: number[];
			orgIds?: number[];
		} = {};
		if (accountIds) {
			body.accountIds = accountIds;
		}
		if (orgIds) {
			body.orgIds = accountIds;
		}

		const response = await this.apiClient.post<
			{ accountIds?: number[]; orgIds?: number[] },
			{ company: any }
		>(
			`/companies/add-nr-info/${companyId}`,
			{
				accountIds,
				orgIds,
			},
			this.apiClient.token
		);

		return true;
	}

	@log()
	@lspHandler(CreateCompanyRequestType)
	createCompany(request: CreateCompanyRequest) {
		return this.apiClient.post("/companies", request, this.apiClient.token);
	}

	@log()
	@lspHandler(CreateForeignCompanyRequestType)
	async createForeignCompany(request: CreateForeignCompanyRequest) {
		const body = {
			...request.request,
			serverUrl: request.host.publicApiUrl,
		};

		const response: CreateForeignCompanyResponse = await this.apiClient.post(
			"/create-xenv-company",
			body,
			this.apiClient.token
		);

		const users = await SessionContainer.instance().users.resolve({
			type: MessageType.Users,
			data: [response.user],
		});
		Container.instance().agent.sendNotification(DidChangeDataNotificationType, {
			type: ChangeDataType.Users,
			data: users,
		});

		return response;
	}

	@lspHandler(CreateTeamTagRequestType)
	async createTeamTag(request: CSTeamTagRequest) {
		await this.apiClient.post(
			`/team-tags/${request.team.id}`,
			{ ...request.tag },
			this.apiClient.token
		);
	}

	@lspHandler(DeleteTeamTagRequestType)
	async deleteTeamTag(request: CSTeamTagRequest) {
		await this.apiClient.delete(
			`/team-tags/${request.team.id}/${request.tag.id}`,
			this.apiClient.token
		);
	}

	@lspHandler(UpdateTeamTagRequestType)
	async updateTeamTag(request: CSTeamTagRequest) {
		await this.apiClient.put(
			`/team-tags/${request.team.id}/${request.tag.id}`,
			{ ...request.tag },
			this.apiClient.token
		);
	}

	@lspHandler(UpdateTeamAdminRequestType)
	async updateTeamAdmin(request: UpdateTeamAdminRequest) {
		await this.apiClient.put(
			`/teams/${request.teamId}`,
			{
				$push: request.add == null ? undefined : { adminIds: request.add },
				$pull: request.remove == null ? undefined : { adminIds: request.remove },
			},
			this.apiClient.token
		);
	}

	@lspHandler(UpdateTeamRequestType)
	async updateTeam(request: UpdateTeamRequest) {
		await this.apiClient.put(`/teams/${request.teamId}`, { ...request }, this.apiClient.token);
	}

	@lspHandler(UpdateTeamSettingsRequestType)
	async updateTeamSettings(request: UpdateTeamSettingsRequest) {
		await this.apiClient.put(
			`/team-settings/${request.teamId}`,
			{ ...request.settings },
			this.apiClient.token
		);
	}

	@lspHandler(AddBlameMapRequestType)
	async addBlameMap(request: AddBlameMapRequest) {
		await this.apiClient.post(
			`/add-blame-map/${request.teamId}`,
			{ email: request.email, userId: request.userId },
			this.apiClient.token
		);
	}

	@lspHandler(DeleteBlameMapRequestType)
	async deleteBlameMap(request: DeleteBlameMapRequest) {
		await this.apiClient.put(
			`/delete-blame-map/${request.teamId}`,
			{ email: request.email },
			this.apiClient.token
		);
	}

	@log()
	async fetchUsers(request: FetchUsersRequest) {
		let path = `/users?teamId=${this.teamId}`;
		if (request.userIds) {
			path += `&ids=${request.userIds.join(",")}`;
		}

		const response = await this.apiClient.get<CSGetUsersResponse>(path, this.apiClient.token);

		// Find ourselves and replace it with our model
		const index = response.users.findIndex(u => u.id === this._userId);
		const me = await SessionContainer.instance().users.getMe();
		if (index !== -1 && me) response.users.splice(index, 1, me);

		return response;
	}

	@log()
	getUser(request: GetUserRequest) {
		if (request.userId === this.userId) {
			return this.getMe();
		}

		return this.apiClient.get<CSGetUserResponse>(`/users/${request.userId}`, this.apiClient.token);
	}

	@log()
	inviteUser(request: InviteUserRequest) {
		const postUserRequest = { ...request, teamId: this.teamId };
		const session = SessionContainer.instance().session;

		// for on-prem, base the server url (and strict flag) into the invite code,
		// so invited users have it set automatically
		if (session.isOnPrem) {
			postUserRequest.inviteInfo = {
				serverUrl: this.apiClient.baseUrl,
				disableStrictSSL: session.disableStrictSSL ? true : false,
			};
		}

		return this.apiClient.post<CSInviteUserRequest, CSInviteUserResponse>(
			"/users",
			postUserRequest,
			this.apiClient.token
		);
	}

	@log()
	deleteUser(request: DeleteUserRequest) {
		return this.apiClient.delete<DeleteUserResponse>(
			`/users/${request.userId}`,
			this.apiClient.token
		);
	}

	@lspHandler(DeleteMeUserRequestType)
	@log()
	deleteMeUser(request: DeleteMeUserRequest) {
		return this.apiClient.delete<DeleteMeUserResponse>(
			`/users/${request.userId}`,
			this.apiClient.token
		);
	}

	@log()
	kickUser(request: KickUserRequest) {
		return this.apiClient.put<any, KickUserResponse>(
			`/teams/${request.teamId}`,
			{
				$addToSet: { removedMemberIds: [request.userId] },
			},
			this.apiClient.token
		);
	}

	@log()
	updateUser(request: UpdateUserRequest) {
		if (request.email) {
			return this.apiClient.put<CSUpdateUserRequest, CSUpdateUserResponse>(
				"/change-email/",
				request,
				this.apiClient.token
			);
		} else {
			return this.apiClient.put<CSUpdateUserRequest, CSUpdateUserResponse>(
				"/users/" + this.userId,
				request,
				this.apiClient.token
			);
		}
	}

	@log()
	async getPreferences() {
		const preferences = await this.apiClient.get<GetPreferencesResponse>(
			"/preferences",
			this.apiClient.token
		);
		safeDecode(preferences);
		return preferences;
	}

	@log()
	async getTelemetryKey(): Promise<string> {
		const telemetrySecret = "84$gTe^._qHm,#D";
		const response = await this.apiClient.get<CSGetTelemetryKeyResponse>(
			`/no-auth/telemetry-key?secret=${encodeURIComponent(telemetrySecret)}`
		);
		return response.key;
	}

	@log()
	async getApiCapabilities(): Promise<CSApiCapabilities> {
		const response = await this.apiClient.get<CSGetApiCapabilitiesResponse>(
			`/no-auth/capabilities`
		);
		return response.capabilities;
	}

	@log()
	async connectThirdPartyProvider(request: { providerId: string; sharing?: boolean }) {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const response = await this.apiClient.get<{ code: string }>(
				`/provider-auth-code?teamId=${this.teamId}${request.sharing ? "&sharing=true" : ""}`,
				this.apiClient.token
			);
			const params: { [key: string]: string } = {
				code: response.code,
			};
			if (providerConfig.isEnterprise) {
				params.host = providerConfig.host;
			}
			if (request.sharing) {
				params.sharing = true.toString();
			}
			// TODO: feature flag
			if (providerConfig.hasServerToken && true) {
				params.requestServerToken = true.toString();
			}

			const query = Object.keys(params)
				.map(param => `${param}=${encodeURIComponent(params[param])}`)
				.join("&");
			void SessionContainer.instance().session.agent.sendRequest(AgentOpenUrlRequestType, {
				url: `${this.apiClient.baseUrl}/no-auth/provider-auth/${providerConfig.name}?${query}`,
			});
			// this response is never used.
			return response;
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log({
		args: {
			0: (request: ThirdPartyProviderSetInfoRequest) => `${request.providerId}`,
		},
	})
	async setThirdPartyProviderInfo(request: ThirdPartyProviderSetInfoRequest) {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const params: CSThirdPartyProviderSetInfoRequestData = {
				data: request.data,
				teamId: this.teamId,
			};

			const response = await this.apiClient.put<
				CSThirdPartyProviderSetInfoRequestData,
				{ user: any }
			>(`/provider-info/${providerConfig.name}`, params, this.apiClient.token);

			// the webview needs to know about the change to the user object with the new provider access token
			// before it can proceed to display the provider as selected in the issues selector for codemarks,
			// so we need to force the data to resolve and send a notification directly from here before returning
			// REALLY don't know how else to do this
			const users = (await SessionContainer.instance().users.resolve({
				type: MessageType.Users,
				data: [response.user],
			})) as CSUser[];
			Container.instance().agent.sendNotification(DidChangeDataNotificationType, {
				type: ChangeDataType.Users,
				data: users,
			});
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log()
	async disconnectThirdPartyProvider(request: { providerId: string; providerTeamId?: string }) {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const params: { teamId: string; host?: string; subId?: string } = {
				teamId: this.teamId,
			};
			if (providerConfig.isEnterprise) {
				params.host = providerConfig.host;
			}
			if (request.providerTeamId) {
				params.subId = request.providerTeamId;
			}

			void (await this.apiClient.put<{ teamId: string; host?: string }, {}>(
				`/provider-deauth/${providerConfig.name}`,
				params,
				this.apiClient.token
			));
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log({
		args: { 1: () => false },
	})
	async refreshAuthProvider<T extends CSRefreshableProviderInfos>(
		providerId: string,
		providerInfo: T
	): Promise<T> {
		const cc = Logger.getCorrelationContext();

		try {
			const url = `/provider-refresh/${providerId}?teamId=${this.teamId}&refreshToken=${providerInfo.refreshToken}`;
			const response = await this.apiClient.get<{ user: any }>(url, this.apiClient.token);

			// Since we are dealing with identity auth don't try to resolve this with the users
			// The "me" user will get updated via the pubnub message
			let user: Partial<CSMe>;
			if (isDirective(response.user)) {
				user = {
					id: response.user.id,
					providerInfo: { [this.teamId]: { [providerId]: { ...providerInfo } } },
				};
				user = resolve(user as any, response.user);
			} else {
				user = response.user;
			}
			return user.providerInfo![this.teamId][providerId] as T;
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log({
		args: { 1: () => false },
	})
	async refreshThirdPartyProvider(request: {
		providerId: string;
		sharing?: boolean;
		subId?: string;
	}): Promise<CSMe> {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const params: { [key: string]: string } = {
				teamId: this.teamId,
			};
			if (providerConfig.isEnterprise) {
				params.host = providerConfig.host;
			}

			const team = `teamId=${this.teamId}`;
			const host = providerConfig.isEnterprise
				? `&host=${encodeURIComponent(providerConfig.host!)}`
				: "";
			const sharing = request.sharing ? "&sharing=true" : "";
			const subId = request.subId ? `&subId=${request.subId}` : "";
			const url = `/provider-refresh/${providerConfig.name}?${team}${host}${sharing}${subId}`;
			const response = await this.apiClient.get<{ user: any }>(url, this.apiClient.token);

			const user = await SessionContainer.instance().session.resolveUserAndNotify(response.user);
			return user as CSMe;
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log()
	async addEnterpriseProviderHost(
		request: AddEnterpriseProviderHostRequest
	): Promise<AddEnterpriseProviderHostResponse> {
		const cc = Logger.getCorrelationContext();
		try {
			const response = await this.apiClient.put<
				CSAddProviderHostRequest,
				CSAddProviderHostResponse
			>(
				`/provider-host/${request.provider}/${request.teamId}`,
				{ host: request.host, ...request.data },
				this.apiClient.token
			);

			await this.teamsManager.resolve({
				type: MessageType.Teams,
				data: [response.team],
			});
			SessionContainer.instance().session.updateProviders();
			return { providerId: response.providerId };
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log()
	async removeEnterpriseProviderHost(request: RemoveEnterpriseProviderHostRequest): Promise<void> {
		const cc = Logger.getCorrelationContext();
		try {
			const response = await this.apiClient.delete<CSRemoveProviderHostResponse>(
				`/provider-host/${request.provider}/${request.teamId}/${encodeURIComponent(
					request.providerId
				)}`,
				this.apiClient.token
			);

			await this.teamsManager.resolve({
				type: MessageType.Teams,
				data: [response.team],
			});
			SessionContainer.instance().session.updateProviders();
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@lspHandler(ProviderTokenRequestType)
	async setProviderToken(request: ProviderTokenRequest) {
		const repoInfo =
			request.repoInfo &&
			`${request.repoInfo.teamId}|${request.repoInfo.repoId}|${request.repoInfo.commitHash}`;
		return this.apiClient.post(`/no-auth/provider-token/${request.provider}`, {
			token: request.token,
			data: request.data,
			invite_code: request.inviteCode,
			repo_info: repoInfo || undefined,
			no_signup: request.noSignup,
			signup_token: request.signupToken,
		});
	}

	@lspHandler(UploadFileRequestType)
	async uploadFile(request: UploadFileRequest) {
		const formData = new FormData();
		if (request.buffer) {
			const base64String = request.buffer;
			// string off dataUri / content info from base64 string
			let bareString = "";
			const commaIndex = base64String.indexOf(",");
			if (commaIndex === -1) {
				bareString = base64String;
			} else {
				bareString = base64String.substring(commaIndex + 1);
			}
			formData.append("file", Buffer.from(bareString, "base64"), {
				filename: request.name,
				contentType: request.mimetype,
			});
		} else {
			formData.append("file", require("fs").createReadStream(request.path));
		}
		const url = `${this.apiClient.baseUrl}/upload-file/${this.teamId}`;
		const headers = new Headers({
			Authorization: `Bearer ${this.apiClient.token}`,
		});

		// note, this bypasses the built-in fetch wrapper and calls node fetch directly,
		// because we're not dealing with json data in the request
		const response = await customFetch(url, { method: "post", body: formData, headers });
		return await response.json();
	}

	@lspHandler(GetNewRelicSignupJwtTokenRequestType)
	async getNewRelicSignupJwtToken(
		request: GetNewRelicSignupJwtTokenRequest
	): Promise<GetNewRelicSignupJwtTokenResponse> {
		const session = SessionContainer.instance().session;
		Logger.log(`getNewRelicSignupJwtToken environment: ${session.environment}`);
		if (session.environment === CodeStreamEnvironment.Unknown || isEmpty(session.environment)) {
			await session.verifyConnectivity();
		}
		const response = await this.apiClient.get<GetNewRelicSignupJwtTokenResponse>(
			`/signup-jwt`,
			this.apiClient.token
		);
		const baseLandingUrl =
			SessionContainer.instance().session.newRelicLandingServiceUrl ??
			"https://landing.service.newrelic.com";
		return {
			...response,
			baseLandingUrl,
		};
	}

	lookupNewRelicOrganizations(
		request: LookupNewRelicOrganizationsRequest
	): Promise<LookupNewRelicOrganizationsResponse> {
		return this.apiClient.post<
			LookupNewRelicOrganizationsRequest,
			LookupNewRelicOrganizationsResponse
		>(`/lookup-nr-orgs`, request, this.apiClient.token);
	}

	announceHistoryFetch(info: HistoryFetchInfo): void {
		const session = SessionContainer.instance().session;
		const queryParams: ParsedUrlQueryInput = { ...info };
		if (session.announceHistoryFetches()) {
			this.apiClient.get<{}>("/history-fetch?" + qs.stringify(queryParams));
		}
	}

	async fetchBuilds(request: FetchThirdPartyBuildsRequest): Promise<FetchThirdPartyBuildsResponse> {
		throw new Error("Not supported");
	}

	// TODO: Move somewhere more generic
	static isStreamSubscriptionRequired(stream: CSStream, userId: string, teamId: string): boolean {
		if (stream.teamId !== teamId) return false;
		if (stream.deactivated || stream.type === StreamType.File) return false;
		if (stream.type === StreamType.Channel) {
			if (stream.memberIds === undefined) return false;
			if (!stream.memberIds.includes(userId)) return false;
		}
		return true;
	}

	// TODO: Move somewhere more generic
	static isStreamUnsubscribeRequired(stream: CSStream, userId: string): boolean {
		if (stream.type !== StreamType.Channel) {
			return false;
		}
		if (stream.memberIds && !stream.memberIds.includes(userId)) {
			return true;
		}
		return false;
	}

	static normalizeResponse<R extends object>(obj?: { [key: string]: any }): R {
		// FIXME maybe the api server should never return arrays with null elements?
		if (obj != null) {
			for (const [key, value] of Object.entries(obj)) {
				if (key === "_id") {
					obj["id"] = value;
				}

				if (Array.isArray(value)) {
					obj[key] = value.map(v => this.normalizeResponse(v));
				} else if (typeof value === "object") {
					obj[key] = this.normalizeResponse(value);
				}
			}
		}

		return obj as R;
	}

	static sanitize(
		body:
			| string
			| ArrayBuffer
			| ArrayBufferView
			| NodeJS.ReadableStream
			| URLSearchParams
			| undefined
	) {
		if (body === undefined || typeof body !== "string") return "";

		return body.replace(
			/("\w*?apikey\w*?":|"\w*?password\w*?":|"\w*?secret\w*?":|"\w*?token\w*?":)".*?"/gi,
			'$1"<hidden>"'
		);
	}

	static sanitizeUrl(url: string) {
		return url.replace(
			/(\b\w*?apikey\w*?=|\b\w*?password\w*?=|\b\w*?secret\w*?=|\b\w*?token\w*?=)(?:.+?)(?=&|$)/gi,
			"$1<hidden>"
		);
	}

	async verifyConnectivity() {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);
		const response: VerifyConnectivityResponse = {
			ok: true,
		};

		try {
			Logger.log("Verifying API server connectivity");

			const resp = await customFetch(this.apiClient.baseUrl + "/no-auth/capabilities", {
				agent: this.apiClient.httpsAgent,
				signal: controller.signal,
			});

			Logger.log(`API server status: ${resp.status}`);
			if (!resp.ok) {
				response.ok = false;
				response.error = {
					message: resp.status.toString() + resp.statusText,
					maintenanceMode: !!resp.headers.get("x-cs-api-maintenance-mode"),
				};
			} else {
				const json = await resp.json();
				response.capabilities = json.capabilities;
				response.environment = json.environment;
				response.isOnPrem = json.isOnPrem;
				response.isProductionCloud = json.isProductionCloud;
				response.newRelicLandingServiceUrl = json.newRelicLandingServiceUrl;
				response.newRelicApiUrl = json.newRelicApiUrl;
				response.newRelicSecApiUrl = json.newRelicSecApiUrl;
				response.environmentHosts = json.environmentHosts;
			}
		} catch (err) {
			Logger.log(`Error connecting to the API server: ${err.message}`);
			response.ok = false;
			if (err.name === "AbortError") {
				response.error = {
					message: "Connection to CodeStream API server timed out after 5 seconds",
				};
			} else {
				response.error = {
					message: err.message,
				};
			}
		} finally {
			clearTimeout(timeout);
		}

		return response;
	}
}
