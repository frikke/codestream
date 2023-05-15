"use strict";
import fs from "fs";
import { sep } from "path";

import {
	BuiltFromResult,
	RelatedRepoWithRemotes,
	CrashOrException,
	Entity,
	EntityAccount,
	EntityGoldenMetrics,
	EntityGoldenMetricsQueries,
	EntityGoldenMetricsResults,
	EntitySearchResponse,
	EntityType,
	ERROR_GENERIC_USE_ERROR_MESSAGE,
	ERROR_NR_CONNECTION_INVALID_API_KEY,
	ERROR_NR_CONNECTION_MISSING_API_KEY,
	ERROR_NR_CONNECTION_MISSING_URL,
	ERROR_NR_INSUFFICIENT_API_KEY,
	ERROR_NRQL_GENERIC,
	ERROR_NRQL_TIMEOUT,
	ERROR_PIXIE_NOT_CONFIGURED,
	ERROR_SLT_MISSING_ENTITY,
	ERROR_SLT_MISSING_OBSERVABILITY_REPOS,
	ErrorGroup,
	ErrorGroupResponse,
	ErrorGroupsResponse,
	ErrorGroupStateType,
	GetAlertViolationsQueryResult,
	GetAlertViolationsResponse,
	GetDeploymentsRequest,
	GetDeploymentsRequestType,
	GetDeploymentsResponse,
	GetEntityCountRequest,
	GetEntityCountRequestType,
	GetEntityCountResponse,
	GetFileLevelTelemetryRequest,
	GetFileLevelTelemetryRequestType,
	GetFileLevelTelemetryResponse,
	GetMethodLevelTelemetryRequest,
	GetMethodLevelTelemetryRequestType,
	GetMethodLevelTelemetryResponse,
	GetNewRelicAccountsRequestType,
	GetNewRelicAccountsResponse,
	GetNewRelicAssigneesRequestType,
	GetNewRelicErrorGroupRequest,
	GetNewRelicErrorGroupRequestType,
	GetNewRelicErrorGroupResponse,
	GetNewRelicRelatedEntitiesRequest,
	GetNewRelicRelatedEntitiesRequestType,
	GetNewRelicRelatedEntitiesResponse,
	GetNewRelicUrlRequest,
	GetNewRelicUrlRequestType,
	GetNewRelicUrlResponse,
	GetObservabilityAnomaliesRequest,
	GetObservabilityAnomaliesRequestType,
	GetObservabilityAnomaliesResponse,
	GetObservabilityEntitiesRequest,
	GetObservabilityEntitiesRequestType,
	GetObservabilityEntitiesResponse,
	GetObservabilityErrorAssignmentsRequest,
	GetObservabilityErrorAssignmentsRequestType,
	GetObservabilityErrorAssignmentsResponse,
	GetObservabilityErrorGroupMetadataRequest,
	GetObservabilityErrorGroupMetadataRequestType,
	GetObservabilityErrorGroupMetadataResponse,
	GetObservabilityErrorsRequest,
	GetObservabilityErrorsRequestType,
	GetObservabilityErrorsResponse,
	GetObservabilityReposRequest,
	GetObservabilityReposRequestType,
	GetObservabilityReposResponse,
	GetObservabilityResponseTimesRequest,
	GetObservabilityResponseTimesRequestType,
	GetObservabilityResponseTimesResponse,
	GetServiceLevelObjectivesRequest,
	GetServiceLevelObjectivesRequestType,
	GetServiceLevelObjectivesResponse,
	GetServiceLevelTelemetryRequest,
	GetServiceLevelTelemetryRequestType,
	GetServiceLevelTelemetryResponse,
	GoldenMetricUnitMappings,
	isNRErrorResponse,
	MethodGoldenMetrics,
	MethodLevelGoldenMetricQueryResult,
	MetricTimesliceNameMapping,
	NewRelicErrorGroup,
	NRErrorResponse,
	NRErrorType,
	ObservabilityError,
	ObservabilityErrorCore,
	ObservabilityRepo,
	ProviderConfigurationData,
	RelatedEntity,
	RelatedEntityByRepositoryGuidsResult,
	ReposScm,
	ServiceLevelObjectiveResult,
	StackTraceResponse,
	ThirdPartyDisconnect,
	ThirdPartyProviderConfig,
	UpdateNewRelicOrgIdRequestType,
	UpdateNewRelicOrgIdRequest,
	UpdateNewRelicOrgIdResponse,
	DidChangeCodelensesNotificationType,
} from "@codestream/protocols/agent";
import { CSMe, CSNewRelicProviderInfo } from "@codestream/protocols/api";
import { GraphQLClient } from "graphql-request";
import {
	flatten as _flatten,
	isEmpty as _isEmpty,
	isUndefined as _isUndefined,
	memoize,
	uniq as _uniq,
	uniqBy as _uniqBy,
} from "lodash-es";
import Cache from "timed-cache";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import { URI } from "vscode-uri";

import { InternalError, ReportSuppressedMessages } from "../agentError";
import { SessionContainer, SessionServiceContainer } from "../container";
import { GitRemoteParser } from "../git/parsers/remoteParser";
import { Logger } from "../logger";
import { CodeStreamSession } from "../session";
import { Functions, log, lspHandler, lspProvider, Strings } from "../system";
import { customFetch } from "../system/fetchCore";
import {
	ClmSpanData,
	CodedError,
	GraphqlNrqlError,
	GraphqlNrqlTimeoutError,
	isClmSpanData,
	isGraphqlNrqlError,
	RepoEntitiesByRemotesResponse,
} from "./newrelic.types";
import { AnomalyDetector } from "./newrelic/anomalyDetection";
import {
	AccessTokenError,
	Directives,
	EntitySearchResult,
	NewRelicId,
	ServiceLevelIndicatorQueryResult,
	ServiceLevelObjectiveQueryResult,
} from "./newrelic/newrelic.types";
import { generateClmSpanDataExistsQuery } from "./newrelic/spanQuery";
import { ThirdPartyIssueProviderBase } from "./thirdPartyIssueProviderBase";
import { ClmManager } from "./newrelic/clm/clmManager";

const ignoredErrors = [GraphqlNrqlTimeoutError];

export function escapeNrql(nrql: string) {
	return nrql.replace(/\\/g, "\\\\\\\\").replace(/\n/g, " ");
}

const ENTITY_CACHE_KEY = "entityCache";

export interface INewRelicProvider {
	getProductUrl: () => string;
	query: <T = any>(query: string, variables: any) => Promise<T>;
	runNrql: <T>(accountId: number, nrql: string, timeout?: number) => Promise<T[]>;
	getRepoName: (repoLike: { folder?: { name?: string; uri: string }; path: string }) => string;
	errorTypeMapper: (ex: Error) => NRErrorType;
	isConnected: (user: CSMe) => boolean;
	getEntityCount: (request?: GetEntityCountRequest) => Promise<GetEntityCountResponse>;
	getObservabilityEntityRepos: (
		repoId: string,
		skipRepoFetch?: boolean,
		force?: boolean
	) => Promise<ObservabilityRepo | undefined>;
	getGoldenSignalsEntity: (
		codestreamUser: CSMe,
		observabilityRepo: ObservabilityRepo
	) => EntityAccount;
	errorLogIfNotIgnored: (ex: Error, message: string, ...params: any[]) => void;
	getDeployments(request: GetDeploymentsRequest): Promise<GetDeploymentsResponse>;
	getLastObservabilityAnomaliesResponse(): GetObservabilityAnomaliesResponse | undefined;
}

@lspProvider("newrelic")
export class NewRelicProvider
	extends ThirdPartyIssueProviderBase<CSNewRelicProviderInfo>
	implements INewRelicProvider
{
	private _newRelicUserId: number | undefined = undefined;
	private _accountIds: number[] | undefined = undefined;
	private _memoizedBuildRepoRemoteVariants: any;
	private _clmSpanDataExistsCache = new Cache<ClmSpanData>({
		defaultTtl: 120 * 1000,
	});
	// 30 second cache
	private _entityCountTimedCache = new Cache<GetEntityCountResponse>({ defaultTtl: 30 * 1000 });
	// 30 second cache
	private _repositoryEntitiesByRepoRemotes = new Cache<RepoEntitiesByRemotesResponse>({
		defaultTtl: 30 * 1000,
	});
	// 30 second cache
	private _observabilityReposCache = new Cache<GetObservabilityReposResponse>({
		defaultTtl: 30 * 1000,
	});

	private _clmManager = new ClmManager(this);

	constructor(session: CodeStreamSession, config: ThirdPartyProviderConfig) {
		super(session, config);
		this._memoizedBuildRepoRemoteVariants = memoize(
			this.buildRepoRemoteVariants,
			(remotes: string[]) => remotes
		);
	}

	get displayName() {
		return "New Relic";
	}

	get name() {
		return "newrelic";
	}

	get headers() {
		return {
			"Api-Key": this.accessToken!,
			"Content-Type": "application/json",
		};
	}

	get apiUrl() {
		const newRelicApiUrl = (this._sessionServiceContainer || SessionContainer.instance()).session
			.newRelicApiUrl;
		return newRelicApiUrl || "https://api.newrelic.com";
	}

	private _sessionServiceContainer: SessionServiceContainer | undefined;
	/**
	 * set the service container (useful for unit tests)
	 *
	 * @memberof NewRelicProvider
	 */
	set sessionServiceContainer(value: SessionServiceContainer) {
		this._sessionServiceContainer = value;
		this._clmManager.sessionServiceContainer = value;
	}

	get productUrl() {
		return this.apiUrl.replace("api", "one");
	}

	getProductUrl() {
		return this.productUrl;
	}

	get baseUrl() {
		return this.apiUrl;
	}

	get coreUrl() {
		return this.apiUrl.replace("api.", "one.");
	}

	get graphQlBaseUrl() {
		return `${this.baseUrl}/graphql`;
	}

	private clearAllCaches() {
		const properties = Object.values(this);
		for (const prop of properties) {
			if (prop && prop instanceof Cache) {
				prop.clear();
			}
		}
	}

	@log()
	async onDisconnected(request?: ThirdPartyDisconnect) {
		// delete the graphql client so it will be reconstructed if a new token is applied
		delete this._client;
		delete this._newRelicUserId;
		delete this._accountIds;
		this.clearAllCaches();

		try {
			// remove these when a user disconnects -- don't want them lingering around
			const { users } = SessionContainer.instance();
			await users.updatePreferences({
				preferences: {
					observabilityRepoEntities: [],
				},
			});
		} catch (ex) {
			ContextLogger.warn("failed to remove observabilityRepoEntities", ex);
		}

		return super.onDisconnected(request);
	}

	protected async client(): Promise<GraphQLClient> {
		const client =
			this._client || (this._client = this.createClient(this.graphQlBaseUrl, this.accessToken));

		client.setHeaders({
			"Api-Key": this.accessToken!,
			"Content-Type": "application/json",
			"NewRelic-Requesting-Services": "CodeStream",
		});
		ContextLogger.setData({
			nrUrl: this.graphQlBaseUrl,
			versionInfo: {
				version: this.session.versionInfo?.extension?.version,
				build: this.session.versionInfo?.extension?.build,
			},
			ide: this.session.versionInfo?.ide,
			isProductionCloud: this.session.isProductionCloud,
		});
		return client;
	}

	protected createClient(graphQlBaseUrl?: string, accessToken?: string): GraphQLClient {
		if (!graphQlBaseUrl) {
			throw new ResponseError(ERROR_NR_CONNECTION_MISSING_URL, "Could not get a New Relic API URL");
		}
		if (!accessToken) {
			throw new ResponseError(
				ERROR_NR_CONNECTION_MISSING_API_KEY,
				"Could not get a New Relic API key"
			);
		}
		const options = {
			agent: this._httpsAgent ?? undefined,
			fetch: customFetch,
		};
		const client = new GraphQLClient(graphQlBaseUrl, options);

		// set accessToken on a per-usage basis... possible for accessToken
		// to be revoked from the source (github.com) and a stale accessToken
		// could be cached in the _client instance.
		client.setHeaders({
			"Api-Key": accessToken!,
			"Content-Type": "application/json",
			"NewRelic-Requesting-Services": "CodeStream",
		});

		return client;
	}

	canConfigure() {
		return true;
	}

	async verifyConnection(config: ProviderConfigurationData): Promise<void> {
		delete this._client;
		await this.createClientAndValidateKey(config.accessToken!);
	}

	async createClientAndValidateKey(apiKey: string) {
		if (this._client && this._newRelicUserId && this._accountIds) {
			return;
		}
		this._client = this.createClient(this.apiUrl + "/graphql", apiKey);
		const { userId, accounts } = await this.validateApiKey(this._client!);
		this._newRelicUserId = userId;
		ContextLogger.log(`Found ${accounts.length} New Relic accounts`);
		this._accountIds = accounts.map(_ => _.id);
	}

	@log()
	async configure(config: ProviderConfigurationData, verify?: boolean): Promise<boolean> {
		if (verify) {
			if (!(await super.configure(config, true))) return false;
		}
		await this.createClientAndValidateKey(config.accessToken!);

		const { orgId } = await this.updateOrgId({ teamId: this.session.teamId });

		config.data = config.data || {};
		config.data.userId = this._newRelicUserId;
		config.data.orgIds = orgId ? [orgId] : [];
		await super.configure(config);

		// update telemetry super-properties
		this.session.addNewRelicSuperProps(this._newRelicUserId!, orgId);
		return true;
	}

	@lspHandler(UpdateNewRelicOrgIdRequestType)
	@log()
	async updateOrgId(request: UpdateNewRelicOrgIdRequest): Promise<UpdateNewRelicOrgIdResponse> {
		const orgId = await this.getOrgId();
		const team = await SessionContainer.instance().teams.getByIdFromCache(request.teamId);
		const company =
			team && (await SessionContainer.instance().companies.getByIdFromCache(team.companyId));
		if (orgId && company) {
			ContextLogger.log(`Associating company ${company.id} with NR org ${orgId}`);
			await this.session.api.addCompanyNewRelicInfo(company.id, undefined, [orgId]);
		}

		return {
			orgId,
		};
	}

	private async validateApiKey(client: GraphQLClient): Promise<{
		userId: number;
		organizationId?: number;
		accounts: any[];
	}> {
		try {
			const response = await client.request<{
				actor: {
					user: {
						id: number;
					};
					organization?: {
						id: number;
					};
					accounts: [
						{
							id: number;
							name: string;
						}
					];
				};
			}>(`{
				actor {
					user {
						id
					}
					accounts {
						id,
						name
					}
				}
			}`);
			return {
				userId: response.actor.user.id,
				accounts: response.actor.accounts,
				organizationId: response.actor.organization?.id,
			};
		} catch (ex) {
			const accessTokenError = this.getAccessTokenError(ex);
			throw new ResponseError(
				ERROR_NR_CONNECTION_INVALID_API_KEY,
				accessTokenError?.message || ex.message || ex.toString()
			);
		}
	}

	async mutate<T>(query: string, variables: any = undefined) {
		await this.ensureConnected();

		return (await this.client()).request<T>(query, variables);
	}

	async query<T = any>(
		query: string,
		variables: any = undefined,
		tryCount: number = 3
	): Promise<T> {
		await this.ensureConnected();

		if (this._providerInfo && this._providerInfo.tokenError) {
			delete this._client;
			throw new InternalError(ReportSuppressedMessages.AccessTokenInvalid);
		}

		let response: any;
		let ex: Error | undefined;
		const fn = async () => {
			try {
				const potentialResponse = await (await this.client()).request<T>(query, variables);
				// GraphQL returns happy HTTP 200 response for api level errors
				this.checkGraphqlErrors(potentialResponse);
				response = potentialResponse;
				return true;
			} catch (potentialEx) {
				Logger.warn(potentialEx.message);
				ex = potentialEx;
				return false;
			}
		};
		await Functions.withExponentialRetryBackoff(fn, tryCount, 1000);

		if (!response && ex) {
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
			ContextLogger.error(ex, `query caught:`);
			const exType = this._isSuppressedException(ex);
			if (exType !== undefined) {
				// this throws the error but won't log to sentry (for ordinary network errors that seem temporary)
				throw new InternalError(exType, { error: ex });
			} else {
				const accessTokenError = this.getAccessTokenError(ex);
				if (accessTokenError) {
					throw new AccessTokenError(accessTokenError.message, ex, true);
				}
				const insufficientApiKeyError = this.getInsufficientApiKeyError(ex);
				if (insufficientApiKeyError) {
					throw new ResponseError(ERROR_NR_INSUFFICIENT_API_KEY, "Insufficient New Relic API key");
				}

				// this is an unexpected error, throw the exception normally
				throw ex;
			}
		}

		return response;
	}

	private getAccessTokenError(ex: any): { message: string } | undefined {
		const requestError = ex as {
			response: {
				errors: {
					extensions: {
						error_code?: string;
						errorClass?: string;
						classification?: string;
					};
					message: string;
				}[];
			};
		};
		if (
			requestError &&
			requestError.response &&
			requestError.response.errors &&
			requestError.response.errors.length
		) {
			return requestError.response.errors.find(
				_ => _.extensions && _.extensions.error_code === "BAD_API_KEY"
			);
		}
		return undefined;
	}

	// Map array of objects based on order of array of strings
	// @TODO: might be worth creating a agent/src/providers/newrelic/utils.tsx file
	// for some of these private functions
	private mapOrder(array: any = [], order: string[] = [], key: string = "") {
		if (array.length > 0 && order.length > 0 && key) {
			array.sort(function (a: any, b: any) {
				return order.indexOf(a[key]) > order.indexOf(b[key]) ? 1 : -1;
			});
		}

		return array;
	}

	private getInsufficientApiKeyError(ex: any): { message: string } | undefined {
		const requestError = ex as {
			response: {
				errors: {
					extensions: {
						error_code?: string;
						errorClass?: string;
						classification?: string;
					};
					message: string;
				}[];
			};
		};
		if (
			requestError &&
			requestError.response &&
			requestError.response.errors &&
			requestError.response.errors.length
		) {
			return requestError.response.errors.find(
				_ =>
					_.extensions &&
					_.extensions.errorClass === "SERVER_ERROR" &&
					_.extensions.classification === "DataFetchingException"
			);
		}
		return undefined;
	}

	generateEntityQueryStatement(search: string): string {
		return `name LIKE '%${Strings.sanitizeGraphqlValue(search)}%'`;
	}

	/**
	 * Autocomplete what user has typed up to N matching entities
	 * Relies on caching in the UI layer (AsyncPaginate)
	 *
	 * Can throw errors
	 *
	 * @param request
	 * @returns Promise<GetObservabilityEntitiesResponse>
	 * @memberof NewRelicProvider
	 */
	@lspHandler(GetObservabilityEntitiesRequestType)
	@log({ timed: true })
	async getEntities(
		request: GetObservabilityEntitiesRequest
	): Promise<GetObservabilityEntitiesResponse> {
		const { limit = 50 } = request;
		try {
			const statement = this.generateEntityQueryStatement(request.searchCharacters);

			const query = `query search($cursor:String){
				actor {
				  entitySearch(query: "type='APPLICATION' and ${statement}", 
				  sortByWithDirection: { attribute: NAME, direction: ASC },
				  options: { limit: ${limit} }) {
					count
					results(cursor:$cursor) {
					  nextCursor
					  entities {
						guid
						name
						account {
							name
						  }
						}
					  }
					}
				  }
			  }`;

			const response: EntitySearchResult = await this.query<EntitySearchResult>(query, {
				cursor: request.nextCursor ?? null,
			});
			const entities = response.actor.entitySearch.results.entities.map(
				(_: { guid: string; name: string; account: { name: string } }) => {
					return {
						guid: _.guid,
						name: `${_.name} (${_.account.name})`,
					};
				}
			);

			return {
				totalResults: response.actor.entitySearch.count,
				entities,
				nextCursor: response.actor.entitySearch.results.nextCursor,
			};
		} catch (ex) {
			ContextLogger.error(ex, "getEntities");
			throw ex;
		}
	}

	@lspHandler(GetObservabilityErrorGroupMetadataRequestType)
	@log({
		timed: true,
	})
	async getErrorGroupMetadata(
		request: GetObservabilityErrorGroupMetadataRequest
	): Promise<GetObservabilityErrorGroupMetadataResponse | undefined> {
		if (!request.errorGroupGuid) return undefined;

		try {
			const metricResponse = await this.getMetricData(request.errorGroupGuid);
			if (!metricResponse) return undefined;

			const mappedRepoEntities = await this.findMappedRemoteByEntity(metricResponse?.entityGuid);
			return {
				entityId: metricResponse?.entityGuid,
				occurrenceId: metricResponse?.traceId,
				relatedRepos: mappedRepoEntities || [],
			} as GetObservabilityErrorGroupMetadataResponse;
		} catch (ex) {
			ContextLogger.error(ex, "getErrorGroupMetadata", {
				request: request,
			});
		}
		return undefined;
	}

	/**
	 * Returns NR errors assigned to this uer
	 *
	 * Can throw errors.
	 *
	 * @param {GetObservabilityErrorAssignmentsRequest} request
	 * @return {Promise<GetObservabilityErrorAssignmentsResponse>}
	 * @memberof NewRelicProvider
	 */
	@lspHandler(GetObservabilityErrorAssignmentsRequestType)
	@log({
		timed: true,
	})
	async getObservabilityErrorAssignments(
		request: GetObservabilityErrorAssignmentsRequest
	): Promise<GetObservabilityErrorAssignmentsResponse> {
		const response: GetObservabilityErrorAssignmentsResponse = { items: [] };

		try {
			const { users } = SessionContainer.instance();
			const me = await users.getMe();

			const result = await this.getErrorsInboxAssignments(me.email);
			if (result) {
				response.items = result.actor.errorsInbox.errorGroups.results
					.filter(_ => {
						// dont show IGNORED or RESOLVED errors
						return !_.state || _.state === "UNRESOLVED";
					})
					.map((_: any) => {
						return {
							entityId: _.entityGuid,
							errorGroupGuid: _.id,
							errorClass: _.name,
							message: _.message,
							errorGroupUrl: _.url,
						} as ObservabilityErrorCore;
					});

				if (response.items && response.items.find(_ => !_.errorClass)) {
					ContextLogger.warn("getObservabilityErrorAssignments has empties", {
						items: response.items,
					});
				}
				ContextLogger.warn("getObservabilityErrorAssignments", {
					itemsCount: response.items.length,
				});
			} else {
				ContextLogger.log("getObservabilityErrorAssignments (none)");
			}
		} catch (ex) {
			ContextLogger.warn("getObservabilityErrorAssignments", {
				error: ex,
			});
			throw ex;
		}

		return response;
	}

	/**
	 * Returns a list of git repos, along with any NR entity associations.
	 *
	 * Can throw errors.
	 *
	 * @param {GetObservabilityReposRequest} request
	 * @return {*}
	 * @memberof NewRelicProvider
	 */
	@lspHandler(GetObservabilityReposRequestType)
	@log({
		timed: true,
	})
	async getObservabilityRepos(
		request: GetObservabilityReposRequest
	): Promise<GetObservabilityReposResponse> {
		const { force = false } = request;
		const cacheKey = JSON.stringify(request);
		if (!force) {
			const cached = this._observabilityReposCache.get(cacheKey);
			if (cached) {
				Logger.log("getObservabilityRepos: from cache", {
					cacheKey,
				});
				return cached;
			}
		}
		const response: GetObservabilityReposResponse = { repos: [] };
		try {
			const { scm } = this._sessionServiceContainer || SessionContainer.instance();
			const reposResponse = await scm.getRepos({ includeRemotes: true });
			let filteredRepos: ReposScm[] | undefined = reposResponse?.repositories;
			if (request?.filters?.length) {
				const repoIds = request.filters.map(_ => _.repoId);
				filteredRepos = reposResponse.repositories?.filter(r => r.id && repoIds.includes(r.id))!;
			}

			filteredRepos = filteredRepos?.filter(_ => _.id);
			if (!filteredRepos || !filteredRepos.length) return response;

			for (const repo of filteredRepos) {
				if (!repo.id || !repo.remotes || !repo.remotes.length) {
					ContextLogger.warn(
						"getObservabilityRepos skipping repo with missing id and/or repo.remotes",
						{
							repo: repo,
						}
					);
					continue;
				}
				const folderName = this.getRepoName({ path: repo.path });

				if (response.repos?.some(_ => _?.repoName === folderName)) {
					ContextLogger.warn("getObservabilityRepos skipping duplicate repo name", {
						repo: repo,
					});
					continue;
				}

				const remotes: string[] = repo.remotes?.map(_ => _.rawUrl!);

				// find REPOSITORY entities tied to a remote
				const repositoryEntitiesResponse = await this.findRepositoryEntitiesByRepoRemotes(
					remotes,
					force
				);

				if (isNRErrorResponse(repositoryEntitiesResponse)) {
					return { error: repositoryEntitiesResponse };
				}

				let remoteUrls: (string | undefined)[] = [];
				let hasRepoAssociation;
				let applicationAssociations;
				if (repositoryEntitiesResponse?.entities) {
					// find RELATED entities that are tied to REPOSITORY entities
					const entitiesReponse = await this.findRelatedEntityByRepositoryGuids(
						repositoryEntitiesResponse?.entities?.map(_ => _.guid)
					);
					// find the APPLICATION entities themselves
					applicationAssociations = entitiesReponse?.actor?.entities?.filter(
						_ =>
							_?.relatedEntities?.results?.filter(r => r.source?.entity?.type === "APPLICATION")
								.length
					);
					hasRepoAssociation = applicationAssociations?.length > 0;

					// find all the unique remotes in all the entities found
					remoteUrls = _uniq(
						_flatten(
							repositoryEntitiesResponse.entities.map(_ => {
								return _.tags?.find(t => t.key === "url")?.values;
							})
						)
					).filter(Boolean);

					ContextLogger.log("found repositories matching remotes", {
						remotes: remotes,
						entities: repositoryEntitiesResponse?.entities?.map(_ => {
							return { guid: _.guid, name: _.name };
						}),
					});
				}

				let remote = "";
				if (remoteUrls && remoteUrls[0]) {
					if (remoteUrls.length > 1) {
						// if for some reason we have > 1 (user has bad remotes, or remotes that point to other places WITH entity mappings)
						ContextLogger.warn("");
						ContextLogger.warn("getEntitiesByRepoRemote FOUND MORE THAN 1 UNIQUE REMOTE", {
							remotes: remotes,
							entityRemotes: remoteUrls,
						});
						ContextLogger.warn("");
					}
					remote = remoteUrls[0];
				} else {
					remote = remotes[0];
				}

				const uniqueEntities: Entity[] = [];
				if (applicationAssociations && applicationAssociations.length) {
					for (const entity of applicationAssociations) {
						if (!entity.relatedEntities?.results) continue;

						for (const relatedResult of entity.relatedEntities.results) {
							if (
								relatedResult?.source?.entity?.type === "APPLICATION" &&
								relatedResult?.target?.entity?.type === "REPOSITORY"
							) {
								// we can't use the target.tags.account since the Repo entity might have been
								// created in _another_ account (under the same trustedAccountId).

								// When a repo entity is created, it is tied to the account where it was created.
								// if it tied to another entity (in another account but still under the same trustedAccount),
								// it's tag.account data will retain the origin account data
								if (!relatedResult?.source?.entity?.account) {
									continue;
								}
								if (
									uniqueEntities.find(
										ue =>
											ue.guid === relatedResult.source.entity.guid &&
											ue.account?.id === relatedResult.source.entity.account?.id
									)
								) {
									continue;
								}
								uniqueEntities.push(relatedResult.source.entity);
							}
						}
					}
				}
				// const hasCodeLevelMetricSpanData = await this.checkHasCodeLevelMetricSpanData(
				// 	hasRepoAssociation === true,
				// 	uniqueEntities
				// );
				response.repos?.push({
					repoId: repo.id!,
					repoName: folderName,
					repoRemote: remote,
					hasRepoAssociation,
					hasCodeLevelMetricSpanData: true,
					entityAccounts: uniqueEntities
						.map(entity => {
							return {
								accountId: entity.account?.id,
								accountName: entity.account?.name || "Account",
								entityGuid: entity.guid,
								entityName: entity.name,
								tags: entity.tags,
								domain: entity.domain,
								alertSeverity: entity?.alertSeverity,
								url: `${this.productUrl}/redirect/entity/${entity.guid}`,
								distributedTracingEnabled: this.hasStandardOrInfiniteTracing(entity),
							} as EntityAccount;
						})
						.filter(Boolean)
						.sort((a, b) =>
							`${a.accountName}-${a.entityName}`.localeCompare(`${b.accountName}-${b.entityName}`)
						),
				});
				ContextLogger.log(`getObservabilityRepos hasRepoAssociation=${hasRepoAssociation}`, {
					repoId: repo.id,
					entities: repositoryEntitiesResponse?.entities?.map(_ => _.guid),
				});
			}
		} catch (ex) {
			ContextLogger.error(ex, "getObservabilityRepos");
			throw ex;
		}

		this._observabilityReposCache.put(cacheKey, response);

		return response;
	}

	private hasStandardOrInfiniteTracing(entity?: Entity): boolean {
		const tags = entity?.tags || [];
		const tracingTag = tags.find(tag => tag.key === "nr.tracing");

		if (!tracingTag) {
			return false;
		}

		const tracingValue = tracingTag.values[0];

		// Values can be either 'standard' for head-based sampling or 'infinite' for tail-based sampling.
		return tracingValue === "standard" || tracingValue === "infinite";
	}

	/**
	 * Get a list of recent error traces associated with a given method
	 *
	 * @param entityGuid entity guid for span data
	 * @param metricTimesliceNames names to use in the NRQL subquery
	 * @param remote the git remote for the error
	 * @param since value to use in the SINCE statement in the NRQL query
	 * @returns list of most recent error traces for each unique fingerprint
	 */
	@log()
	async getMethodLevelErrors(
		entityGuid: string,
		metricTimesliceNames: MetricTimesliceNameMapping,
		remote: string,
		since?: string,
		functionIdentifiers?: {
			codeNamespace?: string;
			functionName?: string;
			relativeFilePath?: string;
		}
	): Promise<ObservabilityError[]> {
		const parsedId = NewRelicProvider.parseId(entityGuid)!;
		const query = this.getMethodLevelErrorsQuery(
			entityGuid,
			metricTimesliceNames,
			since,
			functionIdentifiers
		);
		if (!query) return [];

		const response = await this.query<{
			actor: {
				account: {
					nrql: {
						results: {
							lastOccurrence: number;
							occurrenceId: string;
							appName: string;
							errorClass: string;
							message: string;
							entityGuid: string;
							length: number;
						}[];
					};
				};
			};
		}>(
			`query fetchMethodLevelErrors($accountId:Int!) {
				actor {
					account(id: $accountId) {
						nrql(query: "${query}", timeout: 60) { nrql results }
					}
				}
			}`,
			{
				accountId: parsedId.accountId,
			}
		);
		const result = response.actor.account.nrql.results?.length
			? await Promise.all(
					response.actor.account.nrql.results.map(async errorTrace => {
						const response = await this.getErrorGroupFromNameMessageEntity(
							errorTrace.errorClass,
							errorTrace.message,
							errorTrace.entityGuid
						);

						return {
							entityId: errorTrace.entityGuid,
							appName: errorTrace.appName,
							errorClass: errorTrace.errorClass,
							message: errorTrace.message,
							remote: remote,
							errorGroupGuid: response.actor.errorsInbox.errorGroup.id,
							occurrenceId: errorTrace.occurrenceId,
							count: errorTrace.length,
							lastOccurrence: errorTrace.lastOccurrence,
							errorGroupUrl: response.actor.errorsInbox.errorGroup.url,
						};
					})
			  )
			: [];
		return result;
	}

	private getMethodLevelErrorsQuery(
		entityGuid: string,
		metricTimesliceNames?: MetricTimesliceNameMapping,
		since?: string,
		functionIdentifiers?: {
			codeNamespace?: string;
			functionName?: string;
			relativeFilePath?: string;
		}
	) {
		const transactionNameMatch = metricTimesliceNames?.errorRate?.match(/Errors\/(.*)/);
		if (
			(!transactionNameMatch || transactionNameMatch.length < 2) &&
			!functionIdentifiers?.functionName
		) {
			return undefined;
		}
		let transactionNameSubquery = "";
		if (transactionNameMatch && transactionNameMatch.length >= 2) {
			const transactionName = transactionNameMatch[1];
			transactionNameSubquery = [
				"(",
				`transactionName = '${transactionName}'`,
				"AND",
				`entityGuid = '${entityGuid}'`,
				")",
			].join(" ");
		}
		since = since || "30 minutes ago";
		let codeClause = "";
		let spanSubquery = "";
		if (functionIdentifiers?.functionName) {
			codeClause = `code.function = '${functionIdentifiers.functionName}'`;
			if (functionIdentifiers.codeNamespace) {
				codeClause += ` AND code.namespace = '${functionIdentifiers.codeNamespace}'`;
			}
			if (functionIdentifiers.relativeFilePath) {
				codeClause += ` AND code.filepath = '${functionIdentifiers.relativeFilePath}'`;
			}
			spanSubquery =
				functionIdentifiers && functionIdentifiers.functionName
					? [
							"guid IN (",
							"SELECT",
							"transactionId",
							"FROM Span",
							`WHERE entity.guid = '${entityGuid}'`,
							"WHERE (",
							"error.class IS NOT NULL",
							"OR",
							"error.group.guid",
							")",
							"AND (",
							codeClause,
							")",
							")",
					  ].join(" ")
					: "";
		}
		const whereClause = [transactionNameSubquery, spanSubquery].filter(_ => _ !== "").join(" OR ");
		return [
			"SELECT",
			"count(id) AS 'length',", // first field is used to sort with FACET
			"latest(timestamp) AS 'lastOccurrence',",
			"latest(id) AS 'occurrenceId',",
			"latest(appName) AS 'appName',",
			"latest(error.class) AS 'errorClass',",
			"latest(message) AS 'message',",
			"latest(entityGuid) AS 'entityGuid'",
			"FROM ErrorTrace",
			"WHERE ",
			whereClause,
			"WHERE fingerprint IS NOT NULL",
			"FACET fingerprint AS 'fingerPrintId'",
			`SINCE ${since}`,
			"LIMIT 10",
		].join(" ");
	}

	private async checkHasCodeLevelMetricSpanData(
		hasRepoAssociation: boolean,
		uniqueEntities: Entity[]
	): Promise<boolean | NRErrorResponse> {
		if (!hasRepoAssociation || _isEmpty(uniqueEntities)) {
			return false;
		}
		const repoEntitySpanDataExistsResponse = await this.findClmSpanDataExists(
			uniqueEntities?.map(_ => _.guid)
		);
		if (isNRErrorResponse(repoEntitySpanDataExistsResponse)) {
			return repoEntitySpanDataExistsResponse;
		}
		return repoEntitySpanDataExistsResponse?.find(_ => _ && _["entity.guid"] != null) != null;
	}

	/**
	 * Returns a list of errors for a given entity
	 *
	 * Can throw errors
	 *
	 * @param {GetObservabilityErrorsRequest} request
	 * @return {Promise<GetObservabilityErrorsResponse>}
	 * @memberof NewRelicProvider
	 */
	@lspHandler(GetObservabilityErrorsRequestType)
	@log({
		timed: true,
	})
	async getObservabilityErrors(
		request: GetObservabilityErrorsRequest
	): Promise<GetObservabilityErrorsResponse> {
		const response: GetObservabilityErrorsResponse = { repos: [] };
		try {
			// NOTE: might be able to eliminate some of this if we can get a list of entities
			const { scm } = SessionContainer.instance();
			const reposResponse = await scm.getRepos({ inEditorOnly: true, includeRemotes: true });
			let filteredRepos: ReposScm[] | undefined = reposResponse?.repositories;
			let filteredRepoIds: string[] = [];
			if (request?.filters?.length) {
				filteredRepoIds = request.filters.map(_ => _.repoId);
				filteredRepos = reposResponse.repositories?.filter(
					r => r.id && filteredRepoIds.includes(r.id)
				)!;
			}
			filteredRepos = filteredRepos?.filter(_ => _.id);

			if (!filteredRepos || !filteredRepos.length) return response;

			for (const repo of filteredRepos) {
				if (!repo.remotes || !repo.id) continue;

				const observabilityErrors: ObservabilityError[] = [];
				// don't ask for NR error data if we don't have
				// an explicit want for this repo id
				if (filteredRepoIds.includes(repo.id)) {
					const remotes = repo.remotes.map(_ => {
						return (_ as any).uri!.toString();
					});

					const repositoryEntitiesResponse = await this.findRepositoryEntitiesByRepoRemotes(
						remotes
					);
					if (isNRErrorResponse(repositoryEntitiesResponse)) {
						return { error: repositoryEntitiesResponse };
					}
					let gotoEnd = false;
					if (repositoryEntitiesResponse?.entities?.length) {
						const entityFilter = request.filters?.find(_ => _.repoId === repo.id!);
						for (const entity of repositoryEntitiesResponse.entities) {
							if (!entity.account) {
								ContextLogger.warn("count not find accountId for repo entity", {
									entityGuid: entity.guid,
								});
								continue;
							}
							const relatedEntities = await this.findRelatedEntityByRepositoryGuid(entity.guid);

							const builtFromApplications =
								relatedEntities.actor.entity.relatedEntities.results.filter(
									r =>
										r.type === "BUILT_FROM" &&
										(entityFilter?.entityGuid
											? r.source?.entity.guid === entityFilter.entityGuid
											: true)
								);

							const urlValue = entity.tags?.find(_ => _.key === "url")?.values[0];
							for (const application of builtFromApplications) {
								if (
									!application.source.entity.guid ||
									!application.source.entity.account?.id ||
									application.source.entity.domain !== "APM"
								) {
									continue;
								}

								const errorTraces = await this.findFingerprintedErrorTraces(
									application.source.entity.account.id,
									application.source.entity.guid,
									application.source.entity.entityType
								);
								for (const errorTrace of errorTraces) {
									try {
										const response = await this.getErrorGroupFromNameMessageEntity(
											errorTrace.errorClass,
											errorTrace.message,
											errorTrace.entityGuid
										);

										if (response && response.actor.errorsInbox.errorGroup) {
											observabilityErrors.push({
												entityId: errorTrace.entityGuid,
												appName: errorTrace.appName,
												errorClass: errorTrace.errorClass,
												message: errorTrace.message,
												remote: urlValue!,
												errorGroupGuid: response.actor.errorsInbox.errorGroup.id,
												occurrenceId: errorTrace.occurrenceId,
												count: errorTrace.length,
												lastOccurrence: errorTrace.lastOccurrence,
												errorGroupUrl: response.actor.errorsInbox.errorGroup.url,
											});
											if (observabilityErrors.length > 4) {
												gotoEnd = true;
												break;
											}
										}
									} catch (ex) {
										ContextLogger.warn("internal error getErrorGroupGuid", {
											ex: ex,
										});
									}
								}

								if (gotoEnd) {
									break;
								}
							}

							if (gotoEnd) {
								break;
							}
						}
					}
				}
				response.repos?.push({
					repoId: repo.id!,
					repoName: this.getRepoName(repo),
					errors: observabilityErrors!,
				});
			}
		} catch (ex) {
			ContextLogger.error(ex, "getObservabilityErrors");
			if (ex instanceof ResponseError) {
				throw ex;
			}
			return { error: this.mapNRErrorResponse(ex) };
		}
		return response;
	}

	@lspHandler(GetObservabilityResponseTimesRequestType)
	@log({
		timed: true,
	})
	getObservabilityResponseTimes(
		request: GetObservabilityResponseTimesRequest
	): Promise<GetObservabilityResponseTimesResponse> {
		return this._clmManager.getObservabilityResponseTimes(request);
	}

	private _observabilityAnomaliesTimedCache = new Cache<GetObservabilityAnomaliesResponse>({
		defaultTtl: 120 * 1000,
	});
	private _lastObservabilityAnomaliesResponse: GetObservabilityAnomaliesResponse | undefined;

	getLastObservabilityAnomaliesResponse() {
		return this._lastObservabilityAnomaliesResponse;
	}

	@lspHandler(GetObservabilityAnomaliesRequestType)
	@log({
		timed: true,
	})
	async getObservabilityAnomalies(
		request: GetObservabilityAnomaliesRequest
	): Promise<GetObservabilityAnomaliesResponse> {
		const cached = this._observabilityAnomaliesTimedCache.get(request);
		if (cached) {
			this._lastObservabilityAnomaliesResponse = cached;
			this.session.agent.sendNotification(DidChangeCodelensesNotificationType, undefined);
			return cached;
		}

		this._lastObservabilityAnomaliesResponse = undefined;

		let lastEx;
		const fn = async () => {
			try {
				const { entityGuid } = request;
				const { accountId } = NewRelicProvider.parseId(entityGuid)!;
				const anomalyDetector = new AnomalyDetector(request, this);
				const result = await anomalyDetector.execute();
				this._observabilityAnomaliesTimedCache.put(request, result);
				return true;
			} catch (ex) {
				Logger.warn(ex.message);
				lastEx = ex.message;
				return false;
			}
		};
		await Functions.withExponentialRetryBackoff(fn, 5, 1000);
		const response = this._observabilityAnomaliesTimedCache.get(request) || {
			responseTime: [],
			errorRate: [],
			error: lastEx,
		};

		this._lastObservabilityAnomaliesResponse = response;
		this.session.agent.sendNotification(DidChangeCodelensesNotificationType, undefined);

		return response;
	}

	@log()
	async getPixieToken(accountId: number) {
		try {
			const response = await this.query(
				`query fetchPixieAccessToken($accountId:Int!) {
  					actor {
    					account(id: $accountId) {
      						pixie {
        						pixieAccessToken
      						}
						}
  					}
				}
			  	`,
				{
					accountId: accountId,
				}
			);
			const token = response.actor.account.pixie.pixieAccessToken;

			if (token == null) {
				throw new ResponseError(ERROR_PIXIE_NOT_CONFIGURED, "Unable to fetch Pixie token");
			}

			return token;
		} catch (e) {
			ContextLogger.error(e);
			throw new ResponseError(ERROR_PIXIE_NOT_CONFIGURED, e.message || e.toString());
		}
	}

	@lspHandler(GetNewRelicAccountsRequestType)
	@log()
	async getAccounts(): Promise<GetNewRelicAccountsResponse> {
		try {
			const response = await this.query<{
				actor: {
					accounts: { id: number; name: string }[];
				};
			}>(`{
				actor {
					accounts {
						id,
						name
					}
				}
			}`);
			return response.actor;
		} catch (e) {
			ContextLogger.error(e, "getAccounts");
			throw e;
		}
	}

	@lspHandler(GetNewRelicRelatedEntitiesRequestType)
	@log()
	async getNewRelicRelatedEntities(
		request: GetNewRelicRelatedEntitiesRequest
	): Promise<GetNewRelicRelatedEntitiesResponse | undefined> {
		try {
			const response = await this.query(
				`query relatedEntitiesTest($entityGuid: EntityGuid!) {
					actor {
					  entity(guid: $entityGuid) {
						name
						relatedEntities(filter: {direction: ${request.direction}, relationshipTypes: {include: CALLS}, entityDomainTypes: {include: [{domain: "EXT", type: "SERVICE"}, {domain: "APM", type: "APPLICATION"}]}}) {
							results {
							target {
							  entity {
								name
								guid
								alertSeverity
								domain
								type
								account {
								  name
								}
							  }
							}
							source {
							  entity {
								  name
								  guid
								  alertSeverity
								  domain
								  type
								  account {
									name
								  }
								}
							  }
							type
						  }
						}
					  }
					}
				  }				  
			  	`,
				{
					entityGuid: request.entityGuid,
				}
			);
			if (response?.actor?.entity?.relatedEntities?.results) {
				const results = response.actor.entity.relatedEntities.results.map((_: RelatedEntity) => {
					const _entity = request.direction === "INBOUND" ? _.source.entity : _.target.entity;
					return {
						alertSeverity: _entity.alertSeverity,
						guid: _entity.guid,
						name: _entity.name,
						type: _.type,
						domain: _entity.domain,
						accountName: _entity?.account?.name,
					};
				});
				return results;
			} else {
				return [];
			}
		} catch (e) {
			ContextLogger.error(e, "getRelatedEntities");
			throw e;
		}
	}

	@lspHandler(GetNewRelicUrlRequestType)
	@log()
	async getNewRelicUrl(request: GetNewRelicUrlRequest): Promise<GetNewRelicUrlResponse> {
		return { newRelicUrl: this.productEntityRedirectUrl(request.entityGuid) };
	}

	@lspHandler(GetNewRelicErrorGroupRequestType)
	@log()
	async getNewRelicErrorGroupData(
		request: GetNewRelicErrorGroupRequest
	): Promise<GetNewRelicErrorGroupResponse | undefined> {
		let errorGroup: NewRelicErrorGroup | undefined = undefined;
		let accountId = 0;
		let entityGuid = "";
		try {
			const errorGroupGuid = request.errorGroupGuid;
			const parsedId = NewRelicProvider.parseId(errorGroupGuid)!;
			accountId = parsedId?.accountId;

			let errorGroupFullResponse;

			if (request.entityGuid) {
				entityGuid = request.entityGuid;
				// if we have the entityId use this
				errorGroupFullResponse = await this.fetchErrorGroup(
					accountId,
					errorGroupGuid,
					entityGuid,
					request.occurrenceId,
					request.timestamp
				);
			} else {
				// no entity, look it up
				const errorGroupPartialResponse = await this.fetchErrorGroupById(
					errorGroupGuid,
					request.timestamp
				);
				if (errorGroupPartialResponse?.entityGuid) {
					entityGuid = errorGroupPartialResponse?.entityGuid;
					errorGroupFullResponse = await this.fetchErrorGroup(
						accountId,
						errorGroupGuid,
						entityGuid,
						request.occurrenceId,
						request.timestamp
					);
				}
			}

			ContextLogger.log(
				`getNewRelicErrorGroupData hasRequest.entityGuid=${request.entityGuid != null}`,
				{
					request: request,
				}
			);

			if (errorGroupFullResponse?.actor?.errorsInbox?.errorGroups?.results?.length) {
				const errorGroupResponse = errorGroupFullResponse.actor.errorsInbox.errorGroups.results[0];
				entityGuid = errorGroupResponse.entityGuid;
				errorGroup = {
					entity: {},
					accountId: accountId,
					entityGuid: entityGuid,
					guid: errorGroupResponse.id,
					title: errorGroupResponse.name,
					message: errorGroupResponse.message,

					errorGroupUrl: `${this.productUrl}/redirect/errors-inbox/${errorGroupGuid}`,
					entityUrl: `${this.productUrl}/redirect/entity/${errorGroupResponse.entityGuid}`,
				};

				if (errorGroupResponse.eventsQuery) {
					const timestampRange = this.generateTimestampRange(request.timestamp);
					if (timestampRange) {
						const escapedEventsQuery = Strings.escapeNrql(errorGroupResponse.eventsQuery);
						const nrql = `${escapedEventsQuery} since ${timestampRange?.startTime} until ${timestampRange?.endTime} LIMIT 1`;
						try {
							const result = await this.runNrql<{
								"tags.releaseTag": string;
								"tags.commit": string;
							}>(accountId, nrql);
							if (result.length) {
								errorGroup.releaseTag = result[0]["tags.releaseTag"];
								errorGroup.commit = result[0]["tags.commit"];
							}
						} catch (e) {
							// This query is fragile with invalid nrql escape characters - Strings.escapeNrql
							// catches some but not all of these cases
							Logger.warn(e);
						}
					}
				}

				if (
					errorGroupFullResponse.actor?.entity?.exception?.stackTrace ||
					errorGroupFullResponse.actor?.entity?.crash?.stackTrace
				) {
					errorGroup.errorTrace = {
						path: errorGroupFullResponse.actor.entity.name,
						stackTrace: errorGroupFullResponse.actor.entity.crash
							? errorGroupFullResponse.actor.entity.crash.stackTrace.frames
							: errorGroupFullResponse.actor.entity.exception?.stackTrace?.frames || [],
					};
					errorGroup.hasStackTrace = true;
				}

				errorGroup.attributes = {
					// TODO fix me
					// Timestamp: { type: "timestamp", value: errorGroup.timestamp }
					// "Host display name": { type: "string", value: "11.11.11.11:11111" },
					// "URL host": { type: "string", value: "value" },
					// "URL path": { type: "string", value: "value" }
				};
				if (!errorGroup.hasStackTrace) {
					errorGroup.attributes["Account"] = {
						type: "string",
						value: errorGroupFullResponse.actor.account.name,
					};
					errorGroup.attributes["Entity"] = {
						type: "string",
						value: errorGroupFullResponse.actor.entity.name,
					};
				}

				let states;
				if (errorGroupFullResponse.actor.errorsInbox.errorGroupStateTypes) {
					states = errorGroupFullResponse.actor.errorsInbox.errorGroupStateTypes.map(
						(_: ErrorGroupStateType) => _.type
					);
				}
				errorGroup.states =
					states && states.length ? states : ["UNRESOLVED", "RESOLVED", "IGNORED"];
				errorGroup.errorGroupUrl = errorGroupResponse.url;
				errorGroup.entityName = errorGroupFullResponse.actor.entity.name;
				errorGroup.entityAlertingSeverity = errorGroupFullResponse.actor.entity.alertSeverity;
				errorGroup.state = errorGroupResponse.state || "UNRESOLVED";

				const assignee = errorGroupResponse.assignment;
				if (assignee) {
					errorGroup.assignee = {
						email: assignee.email,
						id: assignee.userInfo?.id,
						name: assignee.userInfo?.name,
						gravatar: assignee.userInfo?.gravatar,
					};
				}

				const relatedRepos = this.findRelatedReposFromServiceEntity(
					errorGroupFullResponse.actor.entity.relatedEntities.results
				);
				if (errorGroup.entity && relatedRepos) {
					errorGroup.entity.relatedRepos;
				}

				ContextLogger.log("ErrorGroup found", {
					errorGroupGuid: errorGroup.guid,
					occurrenceId: request.occurrenceId,
					entityGuid: entityGuid,
					hasErrorGroup: errorGroup != null,
					hasStackTrace: errorGroup?.hasStackTrace === true,
				});
			} else {
				ContextLogger.warn(
					`No errorGroup results errorGroupGuid (${errorGroupGuid}) in account (${accountId})`,
					{
						request: request,
						entityGuid: entityGuid,
						accountId: accountId,
					}
				);
				return {
					accountId: accountId,
					error: {
						message: `Could not find error info for that errorGroupGuid in account (${accountId})`,
						details: (await this.buildErrorDetailSettings(
							accountId,
							entityGuid,
							errorGroupGuid
						)) as any,
					},
				};
			}

			return {
				accountId,
				errorGroup,
			};
		} catch (ex) {
			ContextLogger.error(ex);

			let result: any = {};
			if (ex.response?.errors) {
				result = {
					message: ex.response.errors.map((_: { message: string }) => _.message).join("\n"),
				};
			} else {
				result = { message: ex.message ? ex.message : ex.toString() };
			}

			result.details = (await this.buildErrorDetailSettings(
				accountId,
				entityGuid,
				request.errorGroupGuid
			)) as any;

			return {
				error: result,
				accountId,
				errorGroup: undefined as any,
			};
		}
	}

	@lspHandler(GetNewRelicAssigneesRequestType)
	@log()
	async getAssignableUsers(request: { boardId: string }) {
		const { scm } = SessionContainer.instance();
		const committers = await scm.getLatestCommittersAllRepos({});
		let users: any[] = [];
		if (committers?.scm) {
			users = users.concat(
				Object.keys(committers.scm).map((_: string) => {
					return {
						id: _,
						email: _,
						group: "GIT",
					};
				})
			);
		}

		// TODO fix me get users from NR

		// users.push({
		// 	id: "123",
		// 	displayName: "Some One",
		// 	email: "someone@newrelic.com",
		// 	avatarUrl: "http://...",
		// 	group: "NR"
		// });

		return {
			users: users,
		};
	}

	@log()
	async setAssignee(request: {
		errorGroupGuid: string;
		emailAddress: string;
	}): Promise<Directives | undefined> {
		try {
			const response = await this.setAssigneeByEmail(request!);
			const assignment = response.errorsInboxAssignErrorGroup.assignment;
			// won't be a userInfo object if assigning by email

			return {
				directives: [
					{
						type: "setAssignee",
						data: {
							assignee: {
								email: assignment.email,
								id: assignment?.userInfo?.id,
								name: assignment?.userInfo?.name,
							},
						},
					},
				],
			};
		} catch (ex) {
			ContextLogger.error(ex);
			return undefined;
		}
	}

	@log()
	async removeAssignee(request: {
		errorGroupGuid: string;
		emailAddress?: string;
		userId?: string;
	}): Promise<Directives | undefined> {
		try {
			await this.setAssigneeByUserId({ ...request, userId: "0" });

			return {
				directives: [
					{
						type: "removeAssignee",
						data: {
							assignee: null,
						},
					},
				],
			};
		} catch (ex) {
			ContextLogger.error(ex);
			return undefined;
		}
	}

	@log()
	async setState(request: {
		errorGroupGuid: string;
		state: "RESOLVED" | "UNRESOLVED" | "IGNORED";
	}): Promise<Directives | undefined> {
		try {
			const response = await this.mutate<{
				errorTrackingUpdateErrorGroupState: {
					errors?: { description: string }[];
					state?: string;
				};
			}>(
				`mutation UpdateErrorGroupState($errorGroupGuid: ID!, $state: ErrorsInboxErrorGroupState!) {
					errorsInboxUpdateErrorGroupState(id: $errorGroupGuid, state: $state) {
					  state
					  errors {
						description
						type
					  }
					}
				  }
				  `,
				{
					errorGroupGuid: request.errorGroupGuid,
					state: request.state,
				}
			);

			ContextLogger.log("errorsInboxUpdateErrorGroupState", {
				request: request,
				response: response,
			});

			if (response?.errorTrackingUpdateErrorGroupState?.errors?.length) {
				const stateFailure = response.errorTrackingUpdateErrorGroupState.errors
					.map(_ => _.description)
					.join("\n");
				ContextLogger.warn("errorsInboxUpdateErrorGroupState failure", {
					error: stateFailure,
				});
				throw new Error(stateFailure);
			}

			return {
				directives: [
					{
						type: "setState",
						data: {
							state: request.state,
						},
					},
				],
			};
		} catch (ex) {
			ContextLogger.error(ex as Error);
			throw ex;
		}
	}

	@log()
	async assignRepository(request: {
		/** this is a field that can be parsed to get an accountId */
		parseableAccountId: string;
		/** url from the remote */
		url: string;
		/** entity (application) that is attached to this repo */
		entityId: string;
		/** name of the repo */
		name: string;
		/** we don't always have an errorGroupId */
		errorGroupGuid?: string;
	}): Promise<Directives | undefined> {
		try {
			const parsedId = NewRelicProvider.parseId(request.parseableAccountId)!;
			const accountId = parsedId?.accountId;
			const name = request.name;

			const response = await this.mutate<{
				referenceEntityCreateOrUpdateRepository: {
					created: string[];
					updated: string[];
					failures: {
						guid: string;
						message: string;
						type: string;
					}[];
				};
			}>(
				`mutation ReferenceEntityCreateOrUpdateRepository($accountId: Int!, $name: String!, $url: String!) {
					referenceEntityCreateOrUpdateRepository(sync:true, repositories: [{accountId: $accountId, name: $name, url: $url}]) {
					  created
					  updated
					  failures {
						guid
						message
						type
					  }
					}
				  }
			  `,
				{
					accountId: accountId,
					name: name,
					url: request.url,
				}
			);
			ContextLogger.log("referenceEntityCreateOrUpdateRepository", {
				accountId: accountId,
				name: name,
				url: request.url,
				urlModified: request.url,
				response: response,
			});

			if (response?.referenceEntityCreateOrUpdateRepository?.failures?.length) {
				const failures = response.referenceEntityCreateOrUpdateRepository.failures
					.map(_ => `${_.message} (${_.type})`)
					.join("\n");
				ContextLogger.warn("referenceEntityCreateOrUpdateRepository failures", {
					accountId: accountId,
					name: name,
					url: request.url,
					failures: failures,
				});
				throw new Error(failures);
			}

			const repoEntityId =
				response.referenceEntityCreateOrUpdateRepository.updated[0] ||
				response.referenceEntityCreateOrUpdateRepository.created[0];

			if (!repoEntityId) {
				ContextLogger.warn(
					"referenceEntityCreateOrUpdateRepository no repoEntityId [this is not good]",
					{
						accountId: accountId,
						name: name,
						url: request.url,
					}
				);
			}

			const entityId =
				request.entityId || (await this.fetchErrorGroupById(request.errorGroupGuid!))?.entityGuid;
			if (entityId) {
				const entityRelationshipUserDefinedCreateOrReplaceResponse = await this.mutate<{
					entityRelationshipUserDefinedCreateOrReplace: {
						errors?: { message: string }[];
					};
				}>(
					`mutation EntityRelationshipUserDefinedCreateOrReplace($sourceEntityGuid:EntityGuid!, $targetEntityGuid:EntityGuid!) {
						entityRelationshipUserDefinedCreateOrReplace(sourceEntityGuid: $sourceEntityGuid, targetEntityGuid: $targetEntityGuid, type: BUILT_FROM) {
						  errors {
							message
							type
						  }
						}
					  }
				  `,
					{
						sourceEntityGuid: entityId,
						targetEntityGuid: repoEntityId,
					}
				);
				ContextLogger.log("entityRelationshipUserDefinedCreateOrReplace", {
					sourceEntityGuid: entityId,
					targetEntityGuid: repoEntityId,
					response: entityRelationshipUserDefinedCreateOrReplaceResponse,
				});

				if (
					entityRelationshipUserDefinedCreateOrReplaceResponse
						?.entityRelationshipUserDefinedCreateOrReplace?.errors?.length
				) {
					const createOrReplaceError =
						entityRelationshipUserDefinedCreateOrReplaceResponse.entityRelationshipUserDefinedCreateOrReplace?.errors
							.map(_ => _.message)
							.join("\n");
					ContextLogger.warn("entityRelationshipUserDefinedCreateOrReplace failure", {
						error: createOrReplaceError,
					});
					throw new Error(createOrReplaceError);
				}

				// after the getOrCreate of the repo entity and its association to the entity,
				// query the entity to ensure the repo entity exists
				// this is needed since right after this, a client can re-query to find
				// entities based on the request.url
				const fn = async () => {
					try {
						const result = await this.findRepositoryEntitiesByRepoRemotes([request.url], true);
						if (isNRErrorResponse(result)) {
							return false;
						}
						return !!result?.entities?.length;
					} catch (error) {
						ContextLogger.warn("findRepositoryEntitiesByRepoRemotesResult error", {
							error: error,
						});
						return false;
					}
				};
				// max wait time is (1*1000)+(2*1000)+(3*1000)+(4*1000)+(5*1000) or 15 seconds
				const findRepositoryEntitiesByRepoRemotesResult =
					await Functions.withExponentialRetryBackoff(fn, 5, 1000);
				ContextLogger.log(
					`findRepositoryEntitiesByRepoRemotesResult result=${JSON.stringify(
						findRepositoryEntitiesByRepoRemotesResult
					)}`
				);

				return {
					directives: [
						{
							type: "assignRepository",
							data: {
								id: request.errorGroupGuid,
								entityGuid: entityId,
								repositoryEntityGuid: response?.referenceEntityCreateOrUpdateRepository?.created
									?.length
									? response.referenceEntityCreateOrUpdateRepository.created[0]
									: response?.referenceEntityCreateOrUpdateRepository?.updated?.length
									? response.referenceEntityCreateOrUpdateRepository.updated[0]
									: undefined,
								repo: {
									accountId: accountId,
									name: request.name,
									urls: [request.url],
								},
							},
						},
					],
				};
			} else {
				ContextLogger.warn(
					"entityId needed for entityRelationshipUserDefinedCreateOrReplace is null"
				);
				throw new Error("Could not locate entityId");
			}
		} catch (ex) {
			ContextLogger.error(ex, "assignRepository", {
				request: request,
			});
			throw ex;
		}
	}

	getPythonNamespacePackage(filePath: string) {
		try {
			const splitPath = filePath.split(sep);
			if (!splitPath.length || !splitPath[splitPath.length - 1].endsWith(".py")) {
				return "";
			}

			const fileName = splitPath.pop()!;
			const pythonPath =
				fileName !== "__init__.py" ? [fileName.substring(0, fileName.lastIndexOf("."))] : [];

			while (splitPath.length > 0 && fs.existsSync([...splitPath, ["__init__.py"]].join(sep))) {
				pythonPath.unshift(splitPath.pop()!);
				break;
			}

			return pythonPath.join(".");
		} catch (ex) {
			Logger.warn("Could not get python namespace", { filePath });
			return undefined;
		}
	}

	getGoldenSignalsEntity(
		codestreamUser: CSMe,
		observabilityRepo: ObservabilityRepo
	): EntityAccount {
		let entity: EntityAccount | undefined;
		if (observabilityRepo.entityAccounts.length > 1) {
			try {
				// first, to get from preferences
				if (codestreamUser.preferences) {
					const observabilityRepoEntities =
						codestreamUser.preferences.observabilityRepoEntities || [];
					const methodLevelTelemetryRepoEntity = observabilityRepoEntities.find(
						_ => _.repoId === observabilityRepo.repoId
					);
					if (methodLevelTelemetryRepoEntity?.entityGuid) {
						const foundEntity = observabilityRepo.entityAccounts.find(
							_ => _.entityGuid === methodLevelTelemetryRepoEntity.entityGuid
						);
						if (foundEntity) {
							entity = foundEntity;
						}
					}
				}
				if (!entity) {
					let done = false;
					for (const entityAccount of observabilityRepo.entityAccounts) {
						// second, try to find something production-like based on name
						if (
							["prod", "production", "Production", "PRODUCTION"].find(
								_ => entityAccount.entityName.indexOf(_) > -1
							)
						) {
							entity = entityAccount;
							done = true;
							break;
						}
						if (entityAccount.tags) {
							// third, try to find something production-like based on tags (recommended NR way)
							for (const tag of entityAccount.tags) {
								if (
									["env", "environment", "Environment"].includes(tag.key) &&
									["prod", "production", "Production", "PRODUCTION"].find(value =>
										tag.values.includes(value)
									)
								) {
									entity = entityAccount;
									done = true;
									break;
								}
							}
						}

						if (done) {
							break;
						}
					}
				}
			} catch (ex) {
				Logger.warn("getGoldenSignalsEntity warning", {
					error: ex,
				});
			}
			if (!entity) {
				Logger.warn("getGoldenSignalsEntity: More than one NR entity, selecting first", {
					entity: observabilityRepo.entityAccounts[0],
				});
				entity = observabilityRepo.entityAccounts[0];
			}
		} else {
			entity = observabilityRepo.entityAccounts[0];
		}

		Logger.log("getGoldenSignalsEntity entity found?", {
			entity,
		});

		return entity;
	}

	@lspHandler(GetFileLevelTelemetryRequestType)
	@log()
	getFileLevelTelemetry(
		request: GetFileLevelTelemetryRequest
	): Promise<GetFileLevelTelemetryResponse | NRErrorResponse | undefined> {
		return this._clmManager.getFileLevelTelemetry(request);
	}

	errorTypeMapper(ex: Error): NRErrorType {
		if (ex instanceof CodedError) {
			return ex.code;
		}
		return "NR_UNKNOWN";
	}

	@lspHandler(GetMethodLevelTelemetryRequestType)
	@log()
	async getMethodLevelTelemetry(
		request: GetMethodLevelTelemetryRequest
	): Promise<GetMethodLevelTelemetryResponse | undefined> {
		let observabilityRepo: ObservabilityRepo | undefined;
		let entity: EntityAccount | undefined;
		let entityAccounts: EntityAccount[] = [];

		if (request.repoId) {
			observabilityRepo = await this.getObservabilityEntityRepos(request.repoId);
			if (!observabilityRepo || !observabilityRepo.entityAccounts) {
				return undefined;
			}
			entityAccounts = observabilityRepo.entityAccounts;

			entity = observabilityRepo.entityAccounts.find(
				_ => _.entityGuid === request.newRelicEntityGuid
			);
			if (!entity) {
				ContextLogger.warn("Missing entity", {
					entityId: request.newRelicEntityGuid,
				});
				return undefined;
			}
		}

		try {
			const goldenMetrics = await this.getMethodLevelGoldenMetrics(
				request.newRelicEntityGuid || entity!.entityGuid!,
				request.metricTimesliceNameMapping,
				request.since,
				request.timeseriesGroup
			);

			let deployments;
			if (request.includeDeployments && request.since) {
				deployments = (
					await this.getDeployments({
						entityGuid: request.newRelicEntityGuid || entity!.entityGuid!,
						since: request.since,
					})
				).deployments;
			}

			const errors =
				request.includeErrors && request.metricTimesliceNameMapping
					? await this.getMethodLevelErrors(
							request.newRelicEntityGuid || entity!.entityGuid!,
							request.metricTimesliceNameMapping,
							observabilityRepo?.repoRemote || "",
							request.since,
							request.functionIdentifiers
					  )
					: [];

			const entityGuid = entity?.entityGuid || request.newRelicEntityGuid;
			return {
				goldenMetrics: goldenMetrics,
				deployments,
				errors,
				newRelicEntityAccounts: entityAccounts,
				newRelicAlertSeverity: entity?.alertSeverity,
				newRelicEntityName: entity?.entityName || "",
				newRelicEntityGuid: entityGuid,
				newRelicUrl: `${this.productUrl}/redirect/entity/${entityGuid}`,
			};
		} catch (ex) {
			Logger.error(ex, "getMethodLevelTelemetry", {
				request,
			});
		}

		return undefined;
	}

	@lspHandler(GetServiceLevelTelemetryRequestType)
	@log()
	async getServiceLevelTelemetry(
		request: GetServiceLevelTelemetryRequest
	): Promise<GetServiceLevelTelemetryResponse | undefined> {
		const { force } = request;
		const observabilityRepo = await this.getObservabilityEntityRepos(
			request.repoId,
			request.skipRepoFetch === true,
			force
		);
		if (!request.skipRepoFetch && (!observabilityRepo || !observabilityRepo.entityAccounts)) {
			throw new ResponseError(ERROR_SLT_MISSING_OBSERVABILITY_REPOS, "No observabilityRepos");
		}

		const entity = observabilityRepo?.entityAccounts.find(
			_ => _.entityGuid === request.newRelicEntityGuid
		);
		if (!request.skipRepoFetch && !entity) {
			ContextLogger.warn("Missing entity", {
				entityId: request.newRelicEntityGuid,
			});
			throw new ResponseError(ERROR_SLT_MISSING_ENTITY, "Missing entity");
		}

		let recentAlertViolations: GetAlertViolationsResponse | undefined | NRErrorResponse;
		if (request.fetchRecentAlertViolations) {
			recentAlertViolations = await this.getRecentAlertViolations(request.newRelicEntityGuid);
		}

		const validEntityGuid: string = entity?.entityGuid ?? request.newRelicEntityGuid;

		try {
			const entityGoldenMetrics = await this.getEntityLevelGoldenMetrics(validEntityGuid);

			const response = {
				entityGoldenMetrics: entityGoldenMetrics,
				newRelicEntityAccounts: observabilityRepo?.entityAccounts ?? [],
				newRelicAlertSeverity: entity?.alertSeverity,
				newRelicEntityName: entity?.entityName,
				newRelicEntityGuid: validEntityGuid,
				newRelicUrl: `${this.productUrl}/redirect/entity/${validEntityGuid}`,
				recentAlertViolations: recentAlertViolations,
			};
			return response;
		} catch (ex) {
			Logger.error(ex, "getServiceLevelTelemetry", {
				request,
			});
		}

		return undefined;
	}

	async getRecentAlertViolations(
		entityGuid: string
	): Promise<GetAlertViolationsResponse | NRErrorResponse> {
		try {
			const response = await this.query<GetAlertViolationsQueryResult>(
				`query getRecentAlertViolations($entityGuid: EntityGuid!) {
					actor {
					  entity(guid: $entityGuid) {
						name
						guid
						recentAlertViolations(count: 50) {
						  agentUrl
						  alertSeverity
						  closedAt
						  label
						  level
						  openedAt
						  violationId
						  violationUrl
						}
					  }
					}
				  }				  
				`,
				{
					entityGuid: entityGuid,
				}
			);

			if (response?.actor?.entity) {
				const entity = response?.actor?.entity;
				const recentAlertViolationsArray = entity?.recentAlertViolations.filter(
					_ => _.closedAt === null
				);

				const ALERT_SEVERITY_SORTING_ORDER: string[] = [
					"",
					"CRITICAL",
					"NOT_ALERTING",
					"NOT_CONFIGURED",
					"WARNING",
					"UNKNOWN",
				];

				// get unique labels
				const recentAlertViolationsArrayUnique = _uniqBy(recentAlertViolationsArray, "label");

				// sort based on openedAt time
				recentAlertViolationsArrayUnique.sort((a, b) =>
					a.openedAt > b.openedAt ? 1 : b.openedAt > a.openedAt ? -1 : 0
				);

				// sort based on alert serverity defined in ALERT_SEVERITY_SORTING_ORDER
				const recentAlertViolationsArraySorted = this.mapOrder(
					recentAlertViolationsArray,
					ALERT_SEVERITY_SORTING_ORDER,
					"alertSeverity"
				);

				// take top 2
				const topTwoRecentAlertViolations = recentAlertViolationsArraySorted.slice(0, 2);

				entity.recentAlertViolations = topTwoRecentAlertViolations;

				return entity;
			}
			return {};
		} catch (ex) {
			ContextLogger.warn("getRecentAlertViolations failure", {
				entityGuid,
				error: ex,
			});
			const accessTokenError = ex as {
				message: string;
				innerError?: { message: string };
				isAccessTokenError: boolean;
			};
			if (accessTokenError && accessTokenError.innerError && accessTokenError.isAccessTokenError) {
				throw new Error(accessTokenError.message);
			}
			return this.mapNRErrorResponse(ex);
		}
	}

	/**
	 * Given a CodeStream repoId, get a list of NR entities that have this
	 * git remote attached to it
	 *
	 * @private
	 * @param {string} repoId
	 * @param {boolean} skipRepoFetch - Don't error out, let it be skipped
	 * @param {boolean} force - Don't use cache, force live request
	 * @return {*}
	 * @memberof NewRelicProvider
	 */
	async getObservabilityEntityRepos(
		repoId: string,
		skipRepoFetch = false,
		force = false
	): Promise<ObservabilityRepo | undefined> {
		let observabilityRepos: GetObservabilityReposResponse | undefined;
		try {
			observabilityRepos = await this.getObservabilityRepos({
				filters: [{ repoId: repoId }],
				force,
			});
		} catch (err) {
			this.contextWarnLogIfNotIgnored("getObservabilityEntityRepos", { error: err });
			if (!skipRepoFetch) {
				throw this.mapNRErrorResponse(err);
			}
		}
		if (!observabilityRepos?.repos?.length) {
			ContextLogger.warn("observabilityRepos.repos empty", {
				repoId: repoId,
			});
			return undefined;
		}

		const repo = observabilityRepos.repos.find(_ => _.repoId === repoId);
		if (!repo) {
			ContextLogger.warn("observabilityRepos.repos unmatched for repo", {
				repoId: repoId,
			});
			return undefined;
		}

		// if (!repo.hasRepoAssociation) {
		// 	ContextLogger.warn("Missing repo association", {
		// 		repo: repo
		// 	});

		// 	return undefined;
		// }

		// const entityLength = repo.entityAccounts.length;
		// if (!entityLength) {
		// 	ContextLogger.warn("Missing entities", {
		// 		repo: repo
		// 	});
		// 	return undefined;
		// }
		return repo;
	}

	private async getMethodLevelGoldenMetricQueries(
		entityGuid: string,
		metricTimesliceNameMapping?: MetricTimesliceNameMapping
	): Promise<MethodLevelGoldenMetricQueryResult | undefined> {
		if (!metricTimesliceNameMapping) {
			return undefined;
		}

		return {
			metricQueries: [
				// error
				{
					metricQuery: `SELECT rate(count(apm.service.transaction.error.count), 1 minute) AS 'Errors (per minute)'
												FROM Metric
                  WHERE \`entity.guid\` = '${entityGuid}'
                    AND metricTimesliceName = '${metricTimesliceNameMapping["errorRate"]}' FACET metricTimesliceName TIMESERIES`,
					spanQuery: `SELECT rate(count(*), 1 minute) AS 'Errors (per minute)'
                               FROM Span
                               WHERE entity.guid IN ('${entityGuid}')
                                 AND name = '${metricTimesliceNameMapping["errorRate"]}'
                                 AND \`error.group.guid\` IS NOT NULL FACET name TIMESERIES`,
					title: "Errors (per minute)",
					name: "errorsPerMinute",
				},
				// duration
				{
					metricQuery: `SELECT average(newrelic.timeslice.value) * 1000 AS 'Average duration (ms)'
												FROM Metric
                  WHERE entity.guid IN ('${entityGuid}')
                    AND metricTimesliceName = '${metricTimesliceNameMapping["duration"]}' TIMESERIES`,
					spanQuery: `SELECT average(duration) * 1000 AS 'Average duration (ms)'
                               FROM Span
                               WHERE entity.guid IN ('${entityGuid}')
                                 AND name = '${metricTimesliceNameMapping["duration"]}' FACET name TIMESERIES`,
					title: "Average duration (ms)",
					name: "responseTimeMs",
				},
				// samples
				{
					metricQuery: `SELECT rate(count(newrelic.timeslice.value), 1 minute) AS 'Samples (per minute)'
												FROM Metric
                  WHERE entity.guid IN ('${entityGuid}')
                    AND metricTimesliceName = '${metricTimesliceNameMapping["sampleSize"]}' TIMESERIES`,
					spanQuery: `SELECT rate(count(*), 1 minute) AS 'Samples (per minute)'
                               FROM Span
                               WHERE entity.guid IN ('${entityGuid}')
                                 AND name = '${metricTimesliceNameMapping["sampleSize"]}' FACET name TIMESERIES`,
					title: "Samples (per minute)",
					name: "samplesPerMinute",
				},
			],
		};
	}

	async getMethodLevelGoldenMetrics(
		entityGuid: string,
		metricTimesliceNames?: MetricTimesliceNameMapping,
		since?: string,
		timeseriesGroup?: string
	): Promise<MethodGoldenMetrics[] | undefined> {
		const queries = await this.getMethodLevelGoldenMetricQueries(entityGuid, metricTimesliceNames);

		if (!queries?.metricQueries) {
			Logger.log("getMethodLevelGoldenMetrics no response", {
				entityGuid,
			});
			return undefined;
		}

		Logger.log("getMethodLevelGoldenMetrics has goldenMetrics", {
			entityGuid,
		});

		const parsedId = NewRelicProvider.parseId(entityGuid)!;
		const useSpan = metricTimesliceNames?.source === "span";

		const results = await Promise.all(
			queries.metricQueries.map(_ => {
				let _query = useSpan ? _.spanQuery : _.metricQuery;
				_query = _query?.replace(/\n/g, "");

				// if no metricTimesliceNames, then we don't need TIMESERIES in query
				if (!metricTimesliceNames) {
					_query = _query?.replace(/TIMESERIES/, "");
				}

				if (timeseriesGroup) {
					_query = _query?.replace(/TIMESERIES/, `TIMESERIES ${timeseriesGroup}`);
				}

				if (since) {
					_query = `${_query} SINCE ${since}`;
				}

				const q = `query getMetric($accountId: Int!) {
					actor {
					  account(id: $accountId) {
							nrql(query: "${escapeNrql(_query || "")}", timeout: 60) {
								results
								metadata {
									timeWindow {
										end
									}
								}
							}
					  }
					}
				}`;
				return this.query(q, {
					accountId: parsedId.accountId,
				}).catch(ex => {
					Logger.warn(ex);
				});
			})
		);

		const response = queries.metricQueries.map((_, i) => {
			const nrql = results[i].actor.account.nrql;
			return {
				..._,
				result: nrql.results.map((r: any) => {
					const ms = r.endTimeSeconds * 1000;
					const date = new Date(ms);

					return {
						...r,
						["Average duration (ms)"]: r["Average duration (ms)"]
							? r["Average duration (ms)"].toFixed(2)
							: null,
						["Samples (per minute)"]: r["Samples (per minute)"]
							? r["Samples (per minute)"].toFixed(2)
							: null,
						["Errors (per minute)"]: r["Errors (per minute)"]
							? r["Errors (per minute)"].toFixed(2)
							: null,
						endDate: date,
					};
				}),
				timeWindow: nrql.metadata?.timeWindow?.end,
			};
		});

		Logger.log("getMethodLevelGoldenMetrics has response?", {
			entityGuid,
			responseLength: response?.length,
		});

		return response;
	}

	async getEntityLevelGoldenMetrics(
		entityGuid: string
	): Promise<EntityGoldenMetrics | NRErrorResponse | undefined> {
		try {
			const entityGoldenMetricsQuery = `
				{
				  actor {
					entity(guid: "${entityGuid}") {
					  goldenMetrics {
						metrics {
						  title
						  name
						  unit
						  definition {
							from
							where
							select
						  }
						}
					  }
					}
				  }
				}
			`;

			const entityGoldenMetricsQueryResults = await this.query<EntityGoldenMetricsQueries>(
				entityGoldenMetricsQuery
			);
			const metricDefinitions =
				entityGoldenMetricsQueryResults?.actor?.entity?.goldenMetrics?.metrics;

			if (!metricDefinitions || metricDefinitions.length === 0) {
				Logger.warn("getEntityGoldenMetrics no metricDefinitions", {
					entityGuid,
					response: JSON.stringify(entityGoldenMetricsQueryResults),
				});
				return undefined;
			}

			let gmQuery = `
				{
					actor {
						entity(guid: "${entityGuid}") {
	    	`;

			const since = "30 MINUTES";
			metricDefinitions.forEach(md => {
				const whereClause = md.definition.where ? `WHERE ${md.definition.where}` : "";
				gmQuery += `
					${md.name}: nrdbQuery(nrql: "SELECT ${md.definition.select} AS 'result' FROM ${md.definition.from} ${whereClause} SINCE ${since} AGO", timeout: 60, async: true) {
						results
					}
				`;
			});

			gmQuery += `}
				}
			}`;

			const entityGoldenMetricsResults = await this.query<EntityGoldenMetricsResults>(gmQuery);
			const metricResults = entityGoldenMetricsResults?.actor?.entity;

			const metrics = metricDefinitions.map(md => {
				const metricResult = metricResults[md.name]?.results?.[0]?.result;

				let metricValue: number = NaN;

				if (metricResult !== null && metricResult !== undefined) {
					if (typeof metricResult === "number") {
						// PERCENTAGE values are given as a decimal, IE 0.5 for 50%
						// For the purposes of entity level golden metrics, we
						// want this converted to the % value, not decimal value.
						if (md.unit === "PERCENTAGE") {
							metricValue = metricResult * 100;
						} else {
							metricValue = metricResult;
						}
					}

					if (typeof metricResult === "object") {
						const keys = Object.keys(metricResult);
						metricValue = metricResult[keys[0]];
					}
				}

				// Given a title like "Throughput (ppm)", remove the "(ppm)" part only
				// Given a title like "First input delay (75 percentile) (ms)", remove the "(ms)" part only
				const title = md.title.replace(/\(.{1,3}?\)/, "").trim();

				return {
					name: md.name,
					title: title,
					unit: md.unit,
					displayUnit: GoldenMetricUnitMappings[md.unit],
					value: metricValue,
					displayValue: this.toFixedNoRounding(metricValue, 2) ?? "Unknown",
				};
			});

			return {
				lastUpdated: new Date().toLocaleString(),
				since: since.toLowerCase().replace("minutes", "min"),
				metrics: metrics,
			};
		} catch (ex) {
			Logger.warn("getEntityGoldenMetrics no response", {
				entityGuid,
				error: ex,
			});
			return this.mapNRErrorResponse(ex);
		}
	}

	@lspHandler(GetServiceLevelObjectivesRequestType)
	@log()
	async getServiceLevelObjectives(
		request: GetServiceLevelObjectivesRequest
	): Promise<GetServiceLevelObjectivesResponse | undefined> {
		try {
			const sliQuery = `{
			  actor {
				entity(guid: "${request.entityGuid}") {
				  serviceLevel {
					indicators {
					  name
					  objectives {
						target
						timeWindow {
						  rolling {
							count
							unit
						  }
						}
					  }
					  guid
					  resultQueries {
						indicator {
						  nrql
						}
					  }  
					}
				  }
				}
			  }
			}`;

			const sliResults = await this.query<ServiceLevelIndicatorQueryResult>(sliQuery);

			const indicators = sliResults?.actor?.entity?.serviceLevel?.indicators;

			if (!indicators || indicators?.length === 0) {
				Logger.log("getServiceLevelObjectives No indicators found");
				return undefined;
			}

			let sloQuery = `{
				actor {
	    	`;

			indicators.forEach(v => {
				const indicatorObjective = v.objectives[0].timeWindow.rolling;
				const sinceQuery = `SINCE ${indicatorObjective.count} ${indicatorObjective.unit} AGO`;
				sloQuery += `
				${v.guid}: entity(guid: "${v.guid}") {
					nrdbQuery(nrql: "${v.resultQueries.indicator.nrql} ${sinceQuery}", timeout: 60, async: true) {
						results
					}
				}`;
			});

			sloQuery += `}
			}`;

			const sloResults = await this.query<ServiceLevelObjectiveQueryResult>(sloQuery);

			let objectiveResults: ServiceLevelObjectiveResult[] = indicators
				?.sort((a, b) => a.name.localeCompare(b.name))
				?.map(v => {
					const objective = v.objectives.at(0);
					const sliEntityGuid = v.guid;
					const sliName = v.name;
					const sliTarget = objective?.target || 0;

					const actual = sloResults?.actor[sliEntityGuid]?.nrdbQuery?.results?.at(0);
					const actualKeys = actual && Object.keys(actual);
					const actualValue = (actualKeys && actual[actualKeys[0]]) || 0;

					return {
						guid: sliEntityGuid,
						name: sliName,
						target: this.toFixedNoRounding(sliTarget, 2) ?? "Unknown",
						timeWindow: this.formatSLOTimeWindow(
							objective?.timeWindow?.rolling?.count,
							objective?.timeWindow?.rolling?.unit
						),
						actual: this.toFixedNoRounding(actualValue, 2) ?? "Unknown",
						result: actualValue < sliTarget ? "UNDER" : "OVER",
						summaryPageUrl: this.productEntityRedirectUrl(sliEntityGuid),
					};
				});

			return {
				serviceLevelObjectives: objectiveResults,
			};
		} catch (ex) {
			ContextLogger.warn("getServiceLevelObjectives failure", {
				request,
				error: ex,
			});
			return { error: this.mapNRErrorResponse(ex) };
		}
	}

	private toFixedNoRounding(number: number, precision = 1): string {
		const factor = Math.pow(10, precision);
		return `${Math.floor(number * factor) / factor}`;
	}

	private formatSLOTimeWindow(count: number | undefined, unit: string | undefined): string {
		if (count === undefined || unit === undefined) {
			return "Unknown Time Window";
		}

		return `${count}${unit
			?.toLocaleLowerCase()
			.replace("day", "d")
			.replace("month", "m")
			.replace("year", "y")}`;
	}

	@log()
	private async getPrimaryEntityTransactionType(
		accountId: number,
		entityGuid: string
	): Promise<string> {
		try {
			const query = `{
				actor {
					account(id: ${accountId}) {
						transactionTypeList: nrql(query: "SELECT rate(count(apm.service.transaction.duration), 1 minute) as 'transactionCount' FROM Metric WHERE (entity.guid = '${entityGuid}') LIMIT MAX SINCE 10 MINUTES AGO TIMESERIES facet transactionType", timeout: 60) {
							results
							metadata {
								timeWindow {
									end
								}
							}
						}
					}
				}
			}
			`;

			const results = await this.query(query);
			let transactionTypeArray = results?.actor?.account?.transactionTypeList?.results;
			let transactionTypeCountObject: any = {};

			interface TransactionTypeElement {
				beginTimeSeconds: number;
				endTimeSeconds: number;
				facet: string;
				transactionCount: number;
				transactionType: string;
			}

			transactionTypeArray.forEach((_: TransactionTypeElement) => {
				let transactionType = _.transactionType;
				if (_isUndefined(transactionTypeCountObject[transactionType])) {
					transactionTypeCountObject[transactionType] = 0;
				} else {
					transactionTypeCountObject[transactionType]++;
				}
			});

			const primaryTransactionType = Object.keys(transactionTypeCountObject).reduce((a, b) =>
				transactionTypeCountObject[a] > transactionTypeCountObject[b] ? a : b
			);

			return _isEmpty(primaryTransactionType) ? "Web" : primaryTransactionType;
		} catch (ex) {
			Logger.warn("getServiceGoldenMetrics no response", {
				entityGuid,
				error: ex,
			});
			//default value if nothing is parsed from above query
			return "Web";
		}
	}

	@log()
	private async getUserId(): Promise<number | undefined> {
		try {
			if (this._newRelicUserId != null) {
				return this._newRelicUserId;
			}

			if (this._providerInfo && this._providerInfo.data && this._providerInfo.data.userId) {
				try {
					const id = this._providerInfo.data.userId;
					this._newRelicUserId = parseInt(id.toString(), 10);
					ContextLogger.log("getUserId (found data)", {
						userId: id,
					});
				} catch (ex) {
					ContextLogger.warn("getUserId", {
						error: ex,
					});
				}
			}
			if (this._newRelicUserId) return this._newRelicUserId;

			const response = await this.query(`{ actor { user { id } } }`);
			const id = response.actor?.user?.id;
			if (id) {
				this._newRelicUserId = parseInt(id, 10);
				ContextLogger.log("getUserId (found api)", {
					userId: id,
				});
				return this._newRelicUserId;
			}
		} catch (ex) {
			ContextLogger.warn("getUserId " + ex.message, {
				error: ex,
			});
		}
		return undefined;
	}

	@log()
	private async getOrgId(): Promise<number | undefined> {
		try {
			const response = await this.query<{
				actor: {
					organization: {
						id: number;
					};
				};
			}>(
				`{
					actor {
						organization {
							id
						}
					}
				}`,
				{}
			);
			return response?.actor?.organization?.id;
		} catch (ex) {
			ContextLogger.warn("getOrgId " + ex.message, {
				error: ex,
			});
		}

		return undefined;
	}

	private async fetchErrorGroupById(
		errorGroupGuid: string,
		timestamp?: number
	): Promise<ErrorGroup | undefined> {
		try {
			const timestampRange = this.generateTimestampRange(timestamp);
			const response = await this.query<{
				actor: {
					errorsInbox: {
						errorGroups: {
							results: ErrorGroup[];
						};
					};
				};
			}>(
				`query errorGroupById($ids: [ID!]) {
					actor {
					  errorsInbox {
						errorGroups(filter: {ids: $ids}${
							timestampRange
								? `, timeWindow: {startTime: ${timestampRange.startTime}, endTime: ${timestampRange.endTime}}`
								: ""
						}) {
						  results {
							id
							message
							name
							state
							entityGuid
							eventsQuery
							lastSeenAt
						  }
						}
					  }
					}
				  }`,
				{
					ids: [errorGroupGuid],
				}
			);
			return response?.actor?.errorsInbox?.errorGroups?.results[0] || undefined;
		} catch (ex) {
			ContextLogger.warn("fetchErrorGroupDataById failure", {
				errorGroupGuid,
				error: ex,
			});
			const accessTokenError = ex as {
				message: string;
				innerError?: { message: string };
				isAccessTokenError: boolean;
			};
			if (accessTokenError && accessTokenError.innerError && accessTokenError.isAccessTokenError) {
				throw new Error(accessTokenError.message);
			}
		}

		return undefined;
	}

	@log()
	private async fetchStackTrace(
		entityGuid: string,
		occurrenceId: number | string
	): Promise<StackTraceResponse> {
		let fingerprintId = 0;
		try {
			// BrowserApplicationEntity uses a fingerprint instead of an occurrence and it's a number
			if (typeof occurrenceId === "string" && occurrenceId.match(/^-?\d+$/)) {
				fingerprintId = parseInt(occurrenceId, 10);
			} else if (typeof occurrenceId === "number") {
				fingerprintId = occurrenceId;
			}

			if (fingerprintId) {
				occurrenceId = "";
			}
		} catch {}
		return this.query(
			`query getStackTrace($entityGuid: EntityGuid!, $occurrenceId: String!, $fingerprintId: Int!) {
			actor {
			  entity(guid: $entityGuid) {
				... on ApmApplicationEntity {
				  guid
				  name
				  type
				  entityType
				  exception(occurrenceId: $occurrenceId) {
					message
					stackTrace {
					  frames {
						filepath
						formatted
						line
						name
					  }
					}
				  }
				}
				... on BrowserApplicationEntity {
				  guid
				  name
				  type
				  entityType
				  exception(fingerprint: $fingerprintId) {
					message
					stackTrace {
					  frames {
						column
						line
						formatted
						name
					  }
					}
				  }
				}
				... on MobileApplicationEntity {
				  guid
				  name
				  type
				  entityType
				  exception(occurrenceId: $occurrenceId) {
					stackTrace {
					  frames {
						filepath						
						formatted
						line
						name
					  }
					}
				  }
				  crash(occurrenceId: $occurrenceId) {
					stackTrace {
					  frames {
						filepath						
						formatted
						line
						name
					  }
					}
				  }
				}
			  }
			}
		  }
		  `,
			{
				entityGuid: entityGuid,
				occurrenceId: occurrenceId,
				fingerprintId: fingerprintId,
			}
		);
	}

	@log()
	private async _fetchErrorGroup(
		accountId: number,
		errorGroupGuid: string,
		entityGuid: string,
		timestamp?: number
	): Promise<ErrorGroupResponse> {
		const timestampRange = undefined;
		const q = `query getErrorGroup($accountId: Int!, $errorGroupGuids: [ID!], $entityGuid: EntityGuid!) {
			actor {
			  account(id: $accountId) {
			    name
			  }
			  entity(guid: $entityGuid) {
				alertSeverity
				name
				relatedEntities(filter: {direction: BOTH, relationshipTypes: {include: BUILT_FROM}}) {
				  results {
					source {
					  entity {
						name
						guid
						type
						entityType
					  }
					}
					target {
					  entity {
						name
						guid
						type
						entityType
						tags {
						  key
						  values
						}
					  }
					}
					type
				  }
				}
			  }
			  errorsInbox {
				errorGroupStateTypes {
				  type
				}
				errorGroups(filter: {ids: $errorGroupGuids} ${timestampRange ? "" : ""}) {
				  results {
					url
					id
					message
					name
					state
					entityGuid
					assignment {
					  email
					  userInfo {
						gravatar
						id
						name
					  }
					}
					state
					eventsQuery
				  }
				}
			  }
			}
		  }`;

		return this.query(q, {
			accountId: accountId,
			errorGroupGuids: [errorGroupGuid],
			entityGuid: entityGuid,
		});
	}

	@log()
	private async fetchErrorGroup(
		accountId: number,
		errorGroupGuid: string,
		entityGuid: string,
		occurrenceId?: string,
		timestamp?: number
	): Promise<ErrorGroupResponse> {
		let stackTracePromise;
		if (entityGuid && occurrenceId) {
			try {
				// kick this off
				stackTracePromise = this.fetchStackTrace(entityGuid, occurrenceId);
			} catch (ex) {
				ContextLogger.warn("fetchErrorGroup (stack trace missing)", {
					entityGuid: entityGuid,
					occurrenceId: occurrenceId,
					error: ex,
				});
				stackTracePromise = undefined;
			}
		}

		let response: ErrorGroupResponse = await this._fetchErrorGroup(
			accountId,
			errorGroupGuid,
			entityGuid,
			timestamp
		);
		if (response?.actor?.errorsInbox?.errorGroups?.results?.length === 0) {
			ContextLogger.warn("fetchErrorGroup (retrying without timestamp)", {
				entityGuid: entityGuid,
				occurrenceId: occurrenceId,
			});
			response = await this._fetchErrorGroup(accountId, errorGroupGuid, entityGuid);
		}

		let stackTrace;
		try {
			stackTrace = await stackTracePromise;
			if (stackTrace && occurrenceId && response?.actor?.entity) {
				if (response.actor.entity) {
					response.actor.entity.crash = this.tryFormatStack(
						stackTrace.actor.entity.entityType,
						stackTrace.actor.entity.crash
					);
					response.actor.entity.exception = this.tryFormatStack(
						stackTrace.actor.entity.entityType,
						stackTrace.actor.entity.exception
					);
				}
			}
		} catch (ex) {
			ContextLogger.warn("fetchErrorGroup (stack trace missing upon waiting)", {
				entityGuid: entityGuid,
				occurrenceId: occurrenceId,
				error: ex,
			});
		}

		return response;
	}

	tryFormatStack(entityType: string, exceptionLike: CrashOrException | undefined) {
		const mobileApplicationType = "MOBILE_APPLICATION_ENTITY";
		if (entityType !== mobileApplicationType || !exceptionLike) return exceptionLike;

		try {
			const len = Math.min(exceptionLike.stackTrace.frames.length, 10);
			let fixCount = 0;

			/** if the frame has a formatted property, but it isn't actually formatted
			 * with the filepath and line number, we attempt to make it so  */
			for (let i = 0; i < len; i++) {
				const frame = exceptionLike.stackTrace.frames[i];
				if (
					frame.formatted &&
					frame.line &&
					frame.formatted.indexOf(frame.line.toString()) === -1 &&
					frame.filepath &&
					frame.formatted.indexOf(frame.filepath) === -1
				) {
					fixCount++;
				}
			}

			// if more than a quarter of the frames we checked have an issue
			if (fixCount >= Math.round(len * 0.25)) {
				Logger.log(`fixing ${mobileApplicationType}`);
				for (const frame of exceptionLike.stackTrace.frames) {
					// there have been line numbers like "-2" ;(
					if (frame.filepath && frame.line && frame.line > 0) {
						frame.formatted = `${frame.formatted || ""}(${frame.filepath}:${frame.line})`;
					}
					if (frame.formatted && frame.formatted[0] !== "\t") {
						frame.formatted = `\t${frame.formatted}`;
					}
				}
			}
		} catch (ex) {
			Logger.error(ex, "tryFormatStack");
		}

		return exceptionLike;
	}

	private async buildErrorDetailSettings(
		accountId: number,
		entityGuid: string,
		errorGroupGuid: string
	) {
		let meUser = undefined;
		const { users, session } = SessionContainer.instance();
		try {
			meUser = await users.getMe();
		} catch {}
		if (
			meUser &&
			(meUser.email.indexOf("@newrelic.com") > -1 || meUser.email.indexOf("@codestream.com") > -1)
		) {
			return {
				settings: {
					accountId: accountId,
					errorGroupGuid: errorGroupGuid,
					entityGuid: entityGuid,
					codeStreamUserId: meUser?.id,
					codeStreamTeamId: session?.teamId,
					apiUrl: this.apiUrl,
				},
			};
		}
		return undefined;
	}

	protected async buildRepoRemoteVariants(remotes: string[]): Promise<string[]> {
		const set = new Set<string>();

		await Promise.all(
			remotes.map(async _ => {
				const variants = await GitRemoteParser.getRepoRemoteVariants(_);
				variants.forEach(v => {
					set.add(v.value);
				});
				return true;
			})
		);

		return Array.from(set);
	}

	/**
	 * Finds any Repositories mapped to a remote[s]
	 *
	 * @private
	 * @param {string[]} remotes
	 * @param {boolean} force
	 * @return {*}  {(Promise<RepoEntitiesByRemotesResponse | undefined >)}
	 * @memberof NewRelicProvider
	 */
	protected async findRepositoryEntitiesByRepoRemotes(
		remotes: string[],
		force = false
	): Promise<RepoEntitiesByRemotesResponse | NRErrorResponse> {
		const cacheKey = JSON.stringify(remotes);
		if (!force) {
			const cached = this._repositoryEntitiesByRepoRemotes.get(cacheKey);
			if (cached) {
				Logger.log("findRepositoryEntitiesByRepoRemotes: from cache", {
					cacheKey,
				});
				return cached;
			}
		}
		try {
			const remoteVariants: string[] = await this._memoizedBuildRepoRemoteVariants(remotes);
			if (!remoteVariants.length) return {};

			const remoteFilters = remoteVariants.map((_: string) => `tags.url = '${_}'`).join(" OR ");
			const query = `{
	actor {
	  entitySearch(query: "type = 'REPOSITORY' and (${remoteFilters})") {
		count
		query
		results {
		  entities {
			guid
			name
			account {
				id
				name
			}
			tags {
			  key
			  values
			}
		  }
		}
	  }
	}
  }
  `;
			const queryResponse = await this.query<EntitySearchResponse>(query);
			const response = {
				entities: queryResponse.actor.entitySearch.results.entities,
				remotes: remoteVariants,
			};
			this._repositoryEntitiesByRepoRemotes.put(cacheKey, response);
			return response;
		} catch (ex) {
			ContextLogger.warn("getEntitiesByRepoRemote", {
				error: ex,
			});
			return this.mapNRErrorResponse(ex);
		}
	}

	protected async findClmSpanDataExists(
		newRelicGuids: string[]
	): Promise<ClmSpanData[] | NRErrorResponse> {
		try {
			const results = await Promise.all(
				newRelicGuids.map(async _ => {
					const cached = this._clmSpanDataExistsCache.get(_);
					if (cached) {
						if (Logger.isDebugging) {
							Logger.debug(`findClmSpanDataExists ${JSON.stringify(cached)} from cache for ${_}`);
						}
						return cached;
					}
					const response = await this.query(generateClmSpanDataExistsQuery(_), {
						accountId: NewRelicProvider.parseId(_)?.accountId,
					});
					const spanData = response?.actor?.account?.nrql?.results[0];
					if (isClmSpanData(spanData)) {
						// Only cache valid results
						this._clmSpanDataExistsCache.put(_, spanData);
					}
					return spanData;
				})
			);

			return results;
		} catch (ex) {
			Logger.error(ex);
			return this.mapNRErrorResponse(ex);
		}
	}

	private getFingerprintedErrorTraceQueries(
		applicationGuid: String,
		entityType?: EntityType
	): String[] {
		const apmNrql = [
			"SELECT",
			"latest(timestamp) AS 'lastOccurrence',", // first field is used to sort with FACET
			"latest(id) AS 'occurrenceId',",
			"latest(appName) AS 'appName',",
			"latest(error.class) AS 'errorClass',",
			"latest(message) AS 'message',",
			"latest(entityGuid) AS 'entityGuid',",
			"count(id) AS 'length'",
			"FROM ErrorTrace",
			`WHERE fingerprint IS NOT NULL and entityGuid='${applicationGuid}'`,
			"FACET fingerprint AS 'fingerPrintId'", // group the results by fingerprint
			"SINCE 3 days ago",
			"LIMIT MAX",
		].join(" ");

		const browserNrql = [
			"SELECT",
			"latest(timestamp) AS 'lastOccurrence',", // first field is used to sort with FACET
			"latest(stackHash) AS 'occurrenceId',",
			"latest(appName) AS 'appName',",
			"latest(errorClass) AS 'errorClass',",
			"latest(errorMessage) AS 'message',",
			"latest(entityGuid) AS 'entityGuid',",
			"count(guid) as 'length'",
			"FROM JavaScriptError",
			`WHERE stackHash IS NOT NULL AND entityGuid='${applicationGuid}'`,
			"FACET stackTrace", // group the results by fingerprint
			"SINCE 3 days ago",
			"LIMIT MAX",
		].join(" ");

		const mobileNrql1 = [
			"SELECT",
			"latest(timestamp) AS 'lastOccurrence',", // first field is used to sort with FACET
			"latest(occurrenceId) AS 'occurrenceId',",
			"latest(appName) AS 'appName',",
			"latest(crashLocationClass) AS 'errorClass',",
			"latest(crashMessage) AS 'message',",
			"latest(entityGuid) AS 'entityGuid',",
			"count(occurrenceId) as 'length'",
			"FROM MobileCrash",
			`WHERE entityGuid='${applicationGuid}'`,
			"FACET crashFingerprint", // group the results by fingerprint
			"SINCE 3 days ago",
			"LIMIT MAX",
		].join(" ");

		const mobileNrql2 = [
			"SELECT",
			"latest(timestamp) AS 'lastOccurrence',", // first field is used to sort with FACET
			"latest(handledExceptionUuid) AS 'occurrenceId',",
			"latest(appName) AS 'appName',",
			"latest(exceptionLocationClass) AS 'errorClass',",
			"latest(exceptionMessage) AS 'message',",
			"latest(entityGuid) AS 'entityGuid',",
			"count(handledExceptionUuid) as 'length'",
			"FROM MobileHandledException",
			`WHERE entityGuid='${applicationGuid}'`,
			"FACET handledExceptionUuid", // group the results by fingerprint
			"SINCE 3 days ago",
			"LIMIT MAX",
		].join(" ");

		switch (entityType) {
			case "BROWSER_APPLICATION_ENTITY":
				return [browserNrql];
			case "MOBILE_APPLICATION_ENTITY":
				return [mobileNrql1, mobileNrql2];
			default:
				return [apmNrql];
		}
	}

	/**
	 * Find a list of error traces grouped by fingerprint
	 *
	 * @param accountId the NR1 account id to query against
	 * @param applicationGuid the entityGuid for the application to query for
	 * @returns list of most recent error traces for each unique fingerprint
	 */
	@log({ timed: true })
	private async findFingerprintedErrorTraces(
		accountId: number,
		applicationGuid: string,
		entityType?: EntityType
	) {
		const queries = this.getFingerprintedErrorTraceQueries(applicationGuid, entityType);

		const results = [];
		for (const query of queries) {
			const response = await this.query(
				`query fetchErrorsInboxFacetedData($accountId:Int!) {
						actor {
						  account(id: $accountId) {
							nrql(query: "${query}", timeout: 60) { nrql results }
						  }
						}
					  }
					  `,
				{
					accountId: accountId,
				}
			);
			if (response.actor.account.nrql.results?.length) {
				results.push(...response.actor.account.nrql.results);
			}
		}
		return results;
	}

	protected async findRelatedEntityByRepositoryGuids(
		repositoryGuids: string[]
	): Promise<RelatedEntityByRepositoryGuidsResult> {
		return this.query(
			`query fetchRelatedEntities($guids:[EntityGuid]!){
			actor {
			  entities(guids: $guids) {
				relatedEntities(filter: {direction: BOTH, relationshipTypes: {include: BUILT_FROM}}) {
				  results {
					source {
					  entity {
						account {
							name
							id
						}
						domain
						alertSeverity
						name
						guid
						type
						entityType
						tags {
							key
							values
						}
					  }
					}
					target {
					  entity {
						name
						guid
						type
						entityType
						tags {
							key
							values
						}
					  }
					}
					type
				  }
				}
			  }
			}
		  }
		  `,
			{
				guids: repositoryGuids,
			}
		);
	}

	@log({ timed: true })
	private async findRelatedEntityByRepositoryGuid(repositoryGuid: string): Promise<{
		actor: {
			entity: {
				relatedEntities: {
					results: RelatedEntity[];
				};
			};
		};
	}> {
		return this.query(
			`query fetchRelatedEntities($guid:EntityGuid!){
			actor {
			  entity(guid: $guid) {
				relatedEntities(filter: {direction: BOTH, relationshipTypes: {include: BUILT_FROM}}) {
				  results {
					source {
					  entity {
						account {
							id
							name
						}
						domain
						alertSeverity
						name
						guid
						type
						entityType
					  }
					}
					target {
					  entity {
						name
						guid
						type
						entityType
						tags {
							key
							values
						}
					  }
					}
					type
				  }
				}
			  }
			}
		  }
		  `,
			{
				guid: repositoryGuid,
			}
		);
	}

	@log({ timed: true })
	private async getErrorGroupFromNameMessageEntity(
		name: string,
		message: string,
		entityGuid: string
	) {
		return this.query(
			`query getErrorGroupGuid($name: String!, $message:String!, $entityGuid:EntityGuid!) {
			actor {
			  errorsInbox {
				errorGroup(errorEvent: {name: $name,
				  message: $message,
				  entityGuid: $entityGuid}) {
				  id
				  url
				}
			  }
			}
		  }`,
			{
				name: name,
				message: message,
				entityGuid: entityGuid,
			}
		);
	}

	@log({ timed: true })
	private async getErrorsInboxAssignments(
		emailAddress: string,
		userId?: number
	): Promise<ErrorGroupsResponse | undefined> {
		try {
			if (userId == null || userId === 0) {
				// TODO fix me. remove this once we have a userId on a connection
				userId = await this.getUserId();
			}
			return this.query(
				`query getAssignments($userId: Int, $emailAddress: String!) {
				actor {
				  errorsInbox {
					errorGroups(filter: {isAssigned: true, assignment: {userId: $userId, userEmail: $emailAddress}}) {
					  results {
						url
						state
						name
						message
						id
						entityGuid
					  }
					}
				  }
				}
			  }`,
				{
					userId: userId,
					emailAddress: emailAddress,
				}
			);
		} catch (ex) {
			ContextLogger.warn("getErrorsInboxAssignments", {
				userId: userId,
				usingEmailAddress: emailAddress != null,
				error: ex,
			});
			return undefined;
		}
	}

	/**
	 * from an errorGroupGuid, returns a traceId and an entityId
	 *
	 * @private
	 * @param {string} errorGroupGuid
	 * @return {*}  {(Promise<
	 * 		| {
	 * 				entityGuid: string;
	 * 				traceId: string;
	 * 		  }
	 * 		| undefined
	 * 	>)}
	 * @memberof NewRelicProvider
	 */
	private async getMetricData(errorGroupGuid: string): Promise<
		| {
				entityGuid: string;
				traceId?: string;
		  }
		| undefined
	> {
		try {
			if (!errorGroupGuid) {
				ContextLogger.warn("getMetric missing errorGroupGuid");
				return undefined;
			}

			const accountId = NewRelicProvider.parseId(errorGroupGuid)?.accountId!;

			const errorGroupResponse = await this.fetchErrorGroupById(errorGroupGuid);

			if (!errorGroupResponse) {
				ContextLogger.warn("fetchErrorGroupDataById missing errorGroupGuid");
				return undefined;
			}

			if (!errorGroupResponse.eventsQuery) {
				ContextLogger.warn("fetchErrorGroupDataById missing eventsQuery");
				return undefined;
			}

			const entityGuid = errorGroupResponse.entityGuid;
			const now = new Date().getTime();
			// We need an `id` (aka occurrenceId) from ErrorTrace to get the most recent instance of this ErrorGroup.
			// To do do we use the TransactionError query and modify it to query ErrorTrace.

			// NOTE: we need to add the date range or we risk missing results.
			const errorTraceQuery = `${errorGroupResponse.eventsQuery.replace(
				" TransactionError ",
				" ErrorTrace "
			)} SINCE ${(errorGroupResponse.lastSeenAt || now) - 100000} until ${
				(errorGroupResponse.lastSeenAt || now) + 100000
			} ORDER BY timestamp DESC LIMIT 1`;

			const graphQuery = `query getErrorTrace($accountId: Int!) {
				actor {
				  account(id: $accountId) {
					nrql(query: "${Strings.escapeNrqlWithFilePaths(errorTraceQuery)}", timeout: 60) {
					  results
					}
				  }
				}
			  }`;

			const errorTraceResponse = await this.query<{
				actor: {
					account: {
						nrql: {
							results: {
								entityGuid: string;
								id: string;
							}[];
						};
					};
				};
			}>(graphQuery, {
				accountId: accountId,
			});

			if (errorTraceResponse) {
				const errorTraceResult = errorTraceResponse.actor.account.nrql.results[0];
				if (!errorTraceResult) {
					ContextLogger.warn("getMetricData missing errorTraceResult", {
						accountId: accountId,
						errorGroupGuid: errorGroupGuid,
						metricResult: errorGroupResponse,
					});
					return {
						entityGuid: entityGuid,
					};
				}
				if (errorTraceResult) {
					return {
						entityGuid: entityGuid || errorGroupResponse.entityGuid,
						traceId: errorTraceResult.id,
					};
				}
			}
		} catch (ex) {
			ContextLogger.error(ex, "getMetricData", {
				errorGroupGuid: errorGroupGuid,
			});
		}
		return undefined;
	}

	private async findMappedRemoteByEntity(
		entityGuid: string
	): Promise<RelatedRepoWithRemotes[] | undefined> {
		if (!entityGuid) return undefined;

		const relatedEntityResponse = await this.findRelatedEntityByRepositoryGuid(entityGuid);
		if (relatedEntityResponse) {
			let relatedRepoData = this.findRelatedReposFromServiceEntity(
				relatedEntityResponse.actor.entity.relatedEntities.results
			);

			let relatedRepoDataWithRemotes;

			if (relatedRepoData) {
				relatedRepoDataWithRemotes = await Promise.all(
					relatedRepoData.map(
						async (
							_
						): Promise<{ url?: string; remotes?: string[]; error?: any; name?: string }> => {
							let remotes = await this._memoizedBuildRepoRemoteVariants([_.url]);
							if (!_isEmpty(remotes)) {
								return { ..._, remotes };
							}
							return { ..._ };
						}
					)
				);
			}
			Logger.log("findMappedRemoteByEntity", { entityGuid, relatedRepoDataWithRemotes });
			if (!_isEmpty(relatedRepoDataWithRemotes)) {
				return relatedRepoDataWithRemotes;
			}
		}
		Logger.warn(
			"findMappedRemoteByEntity: no response data from findRelatedEntityByRepositoryGuid",
			entityGuid
		);
		return undefined;
	}

	private setAssigneeByEmail(request: { errorGroupGuid: string; emailAddress: string }) {
		return this.query(
			`mutation errorsInboxAssignErrorGroup($email: String!, $errorGroupGuid: ID!) {
			errorsInboxAssignErrorGroup(assignment: {userEmail: $email}, id: $errorGroupGuid) {
			  assignment {
				email
				userInfo {
				  email
				  gravatar
				  id
				  name
				}
			  }
			}
		  }
		  `,
			{
				email: request.emailAddress,
				errorGroupGuid: request.errorGroupGuid,
			}
		);
	}

	private setAssigneeByUserId(request: { errorGroupGuid: string; userId: string }) {
		return this.query(
			`mutation errorsInboxAssignErrorGroup($userId: Int!, $errorGroupGuid: ID!) {
				errorsInboxAssignErrorGroup(assignment: {userId: $userId}, id: $errorGroupGuid) {
				  assignment {
					email
					userInfo {
					  email
					  gravatar
					  id
					  name
					}
				  }
				}
			  }`,
			{
				errorGroupGuid: request.errorGroupGuid,
				userId: parseInt(request.userId, 10),
			}
		);
	}

	@lspHandler(GetEntityCountRequestType)
	@log()
	async getEntityCount(request?: GetEntityCountRequest): Promise<GetEntityCountResponse> {
		// Cache entity count separately for case of user that has no entity association setup yet
		// if we don't cache the nrql will execute for every single file they open in the IDE
		// Flip side: if cache is too long user will get frustrated that new repo association isn't show up in
		// UI during setup

		const cached = this._entityCountTimedCache.get(ENTITY_CACHE_KEY);
		if (cached && !request?.force) {
			return cached;
		}
		try {
			const apiResult = await this.query(`{
			actor {
			  entitySearch(query: "type='APPLICATION'") {
				count       
			  }
			}
		  }`);
			const result = { entityCount: apiResult?.actor?.entitySearch?.count };
			this._entityCountTimedCache.put(ENTITY_CACHE_KEY, result);
			return result;
		} catch (ex) {
			this.errorLogIfNotIgnored(ex, "getEntityCount");
			if (ex instanceof ResponseError) {
				throw ex;
			}
			if (ex instanceof GraphqlNrqlTimeoutError) {
				throw new ResponseError(ERROR_NRQL_TIMEOUT, ex.message);
			}
			if (ex instanceof GraphqlNrqlError) {
				throw new ResponseError(ERROR_NRQL_GENERIC, ex.message);
			}
			if (ex instanceof CodedError) {
				throw new ResponseError(ERROR_NRQL_GENERIC, ex.message, ex.code);
			}
			throw new ResponseError(ERROR_GENERIC_USE_ERROR_MESSAGE, ex.message);
		}
	}

	private productEntityRedirectUrl(entityGuid: string) {
		return `${this.productUrl}/redirect/entity/${entityGuid}`;
	}

	private findRelatedReposFromServiceEntity(
		relatedEntities: RelatedEntity[]
	): BuiltFromResult[] | undefined {
		if (!relatedEntities || !relatedEntities.length) return undefined;

		const relatedRepoData = relatedEntities.flatMap(_ => {
			if (_.type !== "BUILT_FROM") return [];
			const tags = _.target?.entity?.tags;
			if (tags) {
				const targetEntityTagsValues = tags.find((_: any) => _.key === "url");
				if (
					targetEntityTagsValues &&
					targetEntityTagsValues.values &&
					targetEntityTagsValues.values.length
				) {
					return [
						{
							url: targetEntityTagsValues.values[0],
							name: _.target?.entity?.name,
						},
					];
				}
			}
			return [];
		});

		return _isEmpty(relatedRepoData) ? undefined : relatedRepoData;
	}

	public static parseId(idLike: string): NewRelicId | undefined {
		try {
			const parsed = Buffer.from(idLike, "base64").toString("utf-8");
			if (!parsed) return undefined;

			const split = parsed.split(/\|/);
			// "140272|ERT|ERR_GROUP|12076a73-fc88-3205-92d3-b785d12e08b6"
			const [accountId, unknownAbbreviation, entityType, unknownGuid] = split;
			return {
				accountId: accountId != null ? parseInt(accountId, 10) : 0,
				unknownAbbreviation,
				entityType,
				unknownGuid,
			};
		} catch (e) {
			ContextLogger.warn("" + e.message, {
				idLike,
				error: e,
			});
		}
		return undefined;
	}

	getRepoName(repoLike: { folder?: { name?: string; uri: string }; path: string }) {
		try {
			if (!repoLike) return "repo";

			if (repoLike.folder && (repoLike.folder.name || repoLike.folder.uri)) {
				const folderName = (repoLike.folder.name ||
					URI.parse(repoLike.folder.uri)
						.fsPath.split(/[\\/]+/)
						.pop())!;
				return folderName;
			}
			if (repoLike.path) {
				const folderName = repoLike.path.split(/[\\/]+/).pop()!;
				return folderName;
			}
		} catch (ex) {
			ContextLogger.warn("getRepoName", {
				repoLike: repoLike,
				error: ex,
			});
		}
		return "repo";
	}

	/**
	 * Generates a timestamp range from a given timestamp in ms
	 *
	 * @private
	 * @param {number} [timestampInMilliseconds]
	 * @param {number} [plusOrMinusInMinutes=5]
	 * @return {*}  {({ startTime: number; endTime: number } | undefined)}
	 * @memberof NewRelicProvider
	 */
	private generateTimestampRange(
		timestampInMilliseconds?: number,
		plusOrMinusInMinutes: number = 5
	): { startTime: number; endTime: number } | undefined {
		try {
			if (!timestampInMilliseconds || isNaN(timestampInMilliseconds)) return undefined;

			timestampInMilliseconds = parseInt(timestampInMilliseconds.toString(), 10);

			if (timestampInMilliseconds < 0) return undefined;

			return {
				startTime: timestampInMilliseconds - plusOrMinusInMinutes * 60 * 1000,
				endTime: timestampInMilliseconds + plusOrMinusInMinutes * 60 * 1000,
			};
		} catch (ex) {
			ContextLogger.warn("generateTimestampRange failed", {
				timestampInMilliseconds: timestampInMilliseconds,
				plusOrMinusInMinutes: plusOrMinusInMinutes,
				error: ex,
			});
		}
		return undefined;
	}

	// Public for tests
	public checkGraphqlErrors(response: unknown): void {
		if (isGraphqlNrqlError(response)) {
			const timeoutError = response.errors.find(err => err.extensions?.errorClass === "TIMEOUT");
			if (timeoutError) {
				throw new GraphqlNrqlTimeoutError(response.errors, timeoutError.message);
			}
			const firstMessage = response.errors[0].message;
			throw new GraphqlNrqlError(response.errors, firstMessage);
		}
	}

	errorLogIfNotIgnored(ex: Error, message: string, ...params: any[]): void {
		const match = ignoredErrors.find(ignored => ex instanceof ignored);
		if (!match) {
			ContextLogger.error(ex, message, params);
		}
	}

	private contextWarnLogIfNotIgnored(message: string, ...params: any[]) {
		ContextLogger.warn(message, params);
	}

	async runNrql<T>(accountId: number, nrql: string, timeout: number = 60): Promise<T[]> {
		const query = `query Nrql($accountId:Int!) {
			actor {
				account(id: $accountId) {
					nrql(query: "${nrql}", timeout: ${timeout}) {
						results
					}
				}
			}
	  	}`;
		const results = await this.query<{
			actor: {
				account: {
					nrql: {
						results: T[];
					};
				};
			};
		}>(query, { accountId });
		return results.actor.account.nrql.results;
	}

	private mapNRErrorResponse(ex: Error): NRErrorResponse {
		const type = this.errorTypeMapper(ex);
		if (type) {
			return <NRErrorResponse>{ error: { type, message: ex.message, stack: ex.stack } };
		}
		return <NRErrorResponse>{ error: { type: "NR_UNKNOWN", message: ex.message, stack: ex.stack } };
	}

	@lspHandler(GetDeploymentsRequestType)
	@log({ timed: true })
	public async getDeployments(request: GetDeploymentsRequest): Promise<GetDeploymentsResponse> {
		const { entityGuid, since } = {
			since: "30 days ago",
			...request,
		};
		const parsedId = NewRelicProvider.parseId(entityGuid)!;
		const query = `SELECT timestamp, version FROM Deployment WHERE entity.guid = '${entityGuid}' SINCE ${since} ORDER BY timestamp LIMIT MAX`;
		const result = await this.runNrql<{
			timestamp: number;
			version: string;
		}>(parsedId.accountId, query, 400);

		const deployments = result.map(_ => ({
			seconds: Math.round(_.timestamp / 1000),
			version: _.version,
		}));
		return {
			deployments,
		};
	}
}

export class ContextLogger {
	private static data: any = {};

	/**
	 * pass additional, context data when logging
	 *
	 * @static
	 * @param {*} data
	 * @memberof ContextLogger
	 */
	static setData(data: any) {
		ContextLogger.data = { ...ContextLogger.data, ...data };
	}

	static error(ex: Error, message?: string, params?: any): void {
		Logger.error(ex, `NR: ${message}`, { ...(params || {}), zetails: ContextLogger.data });
	}

	static warn(message: string, params?: any): void {
		if (!message) {
			Logger.warn("");
		} else {
			Logger.warn(`NR: ${message}`, { ...(params || {}), zetails: ContextLogger.data });
		}
	}

	static log(message: string, params?: any): void {
		Logger.log(`NR: ${message}`, { ...(params || {}), zetails: ContextLogger.data });
	}

	static debug(message: string, params?: any): void {
		Logger.debug(`NR: ${message}`, { ...(params || {}), zetails: ContextLogger.data });
	}
}
