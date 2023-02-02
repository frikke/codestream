"use strict";

import {
	CodeStreamDiffUriData,
	EntityAccount,
	GetEntityCountRequest,
	GetEntityCountResponse,
	GetFileLevelTelemetryRequest,
	GetFileLevelTelemetryResponse,
	GetObservabilityResponseTimesRequest,
	GetObservabilityResponseTimesResponse,
	NRErrorResponse,
	NRErrorType,
	ObservabilityRepo,
} from "@codestream/protocols/agent";
import { groupBy as _groupBy } from "lodash-es";
import {
	AdditionalMetadataInfo,
	FunctionInfo,
	MetricQueryRequest,
	MetricTimeslice,
	ResolutionMethod,
	Span,
	SpanRequest,
} from "../newrelic.types";
import { generateSpanQuery, spanQueryTypes } from "../spanQuery";
import { Logger } from "../../../logger";
import { GraphqlNrqlError } from "../../newrelic.types";
import { SessionContainer, SessionServiceContainer } from "../../../container";
import * as csUri from "../../../system/uri";
import { ReviewsManager } from "../../../managers/reviewsManager";
import path, { join, relative, sep } from "path";
import { URI } from "vscode-uri";
import { generateMethodSampleSizeQuery } from "../methodSampleSizeQuery";
import { generateMethodAverageDurationQuery } from "../methodAverageDurationQuery";
import { generateMethodErrorRateQuery } from "../methodErrorRateQuery";
import { ContextLogger } from "../../newrelic";
import Cache from "timed-cache";
import { GitRepository } from "../../../git/models/repository";
import { CSMe } from "@codestream/protocols/api";
import { Index } from "@codestream/utils/types";

export class CLMProvider {
	constructor(
		private _getProductUrl: () => string,
		private _query: <T = any>(query: string, variables: any) => Promise<T>,
		private _runNrql: <T>(accountId: number, nrql: string, timeout?: number) => Promise<T[]>,
		private _getRepoName: (repoLike: {
			folder?: { name?: string; uri: string };
			path: string;
		}) => string,
		private _errorTypeMapper: (ex: Error) => NRErrorType,
		private _isConnected: (user: CSMe) => boolean,
		private _getEntityCount: (request?: GetEntityCountRequest) => Promise<GetEntityCountResponse>,
		private _getObservabilityEntityRepos: (
			repoId: string,
			skipRepoFetch?: boolean,
			force?: boolean
		) => Promise<ObservabilityRepo | undefined>,
		private _getGoldenSignalsEntity: (
			codestreamUser: CSMe,
			observabilityRepo: ObservabilityRepo
		) => EntityAccount,
		private _errorLogIfNotIgnored: (ex: Error, message: string, ...params: any[]) => void
	) {}

	// 2 minute cache
	private _mltTimedCache = new Cache<GetFileLevelTelemetryResponse | null>({
		defaultTtl: 120 * 1000,
	});

	private _sessionServiceContainer: SessionServiceContainer | undefined;
	set sessionServiceContainer(value: SessionServiceContainer) {
		this._sessionServiceContainer = value;
	}

	async getFileLevelTelemetry(
		request: GetFileLevelTelemetryRequest
	): Promise<GetFileLevelTelemetryResponse | NRErrorResponse | undefined> {
		const { git } = this._sessionServiceContainer || SessionContainer.instance();
		const languageId: LanguageId | undefined = isSupportedLanguage(request.languageId)
			? request.languageId
			: undefined;
		if (!languageId) {
			ContextLogger.warn("getFileLevelTelemetry: languageId not supported");
			return undefined;
		}

		if (!request.fileUri && !request.locator) {
			ContextLogger.warn("getFileLevelTelemetry: Missing fileUri, or method locator");
			return undefined;
		}

		let filePath = undefined;
		if (request.fileUri.startsWith("codestream-diff://")) {
			let parsedUri = undefined;
			if (csUri.Uris.isCodeStreamDiffUri(request.fileUri)) {
				parsedUri = csUri.Uris.fromCodeStreamDiffUri<CodeStreamDiffUriData>(request.fileUri);
			} else {
				parsedUri = ReviewsManager.parseUri(request.fileUri);
			}
			const repo = parsedUri?.repoId && (await git.getRepositoryById(parsedUri?.repoId));
			filePath = repo && parsedUri?.path && path.join(repo.path, parsedUri.path);
		} else {
			const parsedUri = URI.parse(request.fileUri);
			filePath = parsedUri.fsPath;
		}
		if (!filePath) {
			ContextLogger.warn(
				`getFileLevelTelemetry: Unable to resolve filePath from URI ${request.fileUri}`
			);
			return undefined;
		}

		const resolutionMethod = this.getResolutionMethod(languageId);
		const cacheKey =
			resolutionMethod === "filePath"
				? [filePath, request.languageId].join("-")
				: [Object.values(request.locator!).join("-"), request.languageId].join("-");

		if (request.resetCache) {
			Logger.log("getFileLevelTelemetry: resetting cache", {
				cacheKey,
			});
			this._mltTimedCache.clear();
			Logger.log("getFileLevelTelemetry: reset cache complete", {
				cacheKey,
			});
		} else {
			const cached = this._mltTimedCache.get(cacheKey);
			// Using null here to differentiate no result for file (null) vs not cached (undefined)
			if (cached !== undefined) {
				// Is null or real response
				Logger.log("getFileLevelTelemetry: from cache", {
					cacheKey,
				});
				return cached ?? undefined;
			}
		}

		const { result, error } = await this.resolveEntityAccount(filePath);
		if (error) return error;
		if (!result) return undefined;
		const { entity, relativeFilePath, observabilityRepo, repoForFile, remote } = result;

		const newRelicAccountId = entity.accountId;
		const newRelicEntityGuid = entity.entityGuid;
		let entityName = entity.entityName;

		try {
			const { spans, averageDurationResponse, sampleSizeResponse, errorRateResponse } =
				await this.getFileLevelTelemetryWithSpanLookup(
					languageId,
					newRelicAccountId,
					newRelicEntityGuid,
					relativeFilePath,
					request,
					resolutionMethod
				);

			const sampleSizeResponseLength = sampleSizeResponse?.actor?.account?.nrql?.results.length;
			const averageDurationResponseLength =
				averageDurationResponse?.actor?.account?.nrql?.results.length;
			const errorRateResponseLength = errorRateResponse?.actor?.account?.nrql?.results.length;

			const hasAnyData =
				sampleSizeResponseLength || averageDurationResponseLength || errorRateResponseLength;
			const response: GetFileLevelTelemetryResponse = {
				codeNamespace: request?.locator?.namespace,
				isConnected: true,
				sampleSize: sampleSizeResponse ? sampleSizeResponse.actor.account.nrql.results : [],
				averageDuration: averageDurationResponse
					? averageDurationResponse.actor.account.nrql.results
					: [],
				errorRate: errorRateResponse ? errorRateResponse.actor.account.nrql.results : [],
				sinceDateFormatted: "30 minutes", //begin ? Dates.toFormatter(new Date(begin)).fromNow() : "",
				lastUpdateDate:
					errorRateResponse?.actor?.account?.nrql?.metadata?.timeWindow?.end ||
					averageDurationResponse?.actor?.account?.nrql?.metadata?.timeWindow?.end ||
					sampleSizeResponse?.actor?.account?.nrql?.metadata?.timeWindow?.end,
				hasAnyData: hasAnyData,
				newRelicAlertSeverity: entity.alertSeverity,
				newRelicAccountId: newRelicAccountId,
				newRelicEntityGuid: newRelicEntityGuid,
				newRelicEntityName: entityName,
				newRelicEntityAccounts: observabilityRepo.entityAccounts,
				repo: {
					id: repoForFile.id!,
					name: this._getRepoName(repoForFile),
					remote: remote,
				},
				relativeFilePath: relativeFilePath,
				newRelicUrl: `${this._getProductUrl()}/redirect/entity/${newRelicEntityGuid}`,
			};

			if (spans?.length > 0) {
				this._mltTimedCache.put(cacheKey, response);
				Logger.log("getFileLevelTelemetry caching success", {
					spansLength: spans.length,
					hasAnyData: hasAnyData,
					data: {
						throughputResponseLength: sampleSizeResponseLength,
						averageDurationResponseLength,
						errorRateResponseLength,
					},
					newRelicEntityGuid,
					newRelicAccountId,
				});
			} else {
				// Cache that there are no spans for this file for a shorter duration
				this._mltTimedCache.put(cacheKey, null, { ttl: 60 * 1000 });
				Logger.log("getFileLevelTelemetry no spans", {
					hasAnyData,
					relativeFilePath,
					newRelicEntityGuid,
					newRelicAccountId,
				});
			}
			return response;
		} catch (ex) {
			if (ex instanceof GraphqlNrqlError) {
				const type = this._errorTypeMapper(ex);
				Logger.warn(`getFileLevelTelemetry error ${type}`, {
					request,
					newRelicEntityGuid,
					newRelicAccountId,
				});
				return <NRErrorResponse>{
					error: {
						message: ex.message,
						type,
					},
				};
			}
			Logger.error(ex, "getFileLevelTelemetry", {
				request,
				newRelicEntityGuid,
				newRelicAccountId,
			});
		}

		Logger.log("getFileLevelTelemetry returning undefined", {
			relativeFilePath,
			newRelicEntityGuid,
			newRelicAccountId,
		});

		return undefined;
	}

	async getObservabilityResponseTimes(
		request: GetObservabilityResponseTimesRequest
	): Promise<GetObservabilityResponseTimesResponse> {
		const parsedUri = URI.parse(request.fileUri);
		const filePath = parsedUri.fsPath;
		const { result, error } = await this.resolveEntityAccount(filePath);
		if (!result)
			return {
				responseTimes: [],
			};

		// const query =
		// 	`SELECT average(newrelic.timeslice.value) * 1000 AS 'value' ` +
		// 	`FROM Metric WHERE \`entity.guid\` = '${result.entity.entityGuid}' ` +
		// 	`AND (metricTimesliceName LIKE 'Java/%' OR metricTimesliceName LIKE 'Custom/%')` +
		// 	`FACET metricTimesliceName AS name ` +
		// 	`SINCE 7 days ago LIMIT MAX`;

		const query =
			`SELECT average(duration) * 1000 AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${result.entity.entityGuid}' ` +
			`AND (name LIKE 'Java/%' OR name LIKE 'Custom/%')` +
			`FACET name ` +
			`SINCE 7 days ago LIMIT MAX`;

		const results = await this._runNrql<{ name: string; value: number }>(
			result.entity.accountId,
			query,
			200
		);
		return {
			responseTimes: results,
		};
	}

	private async resolveEntityAccount(filePath: string): Promise<{
		result?: {
			entity: EntityAccount;
			relativeFilePath: string;
			observabilityRepo: ObservabilityRepo;
			repoForFile: GitRepository;
			remote: string;
		};
		error?: NRErrorResponse;
	}> {
		const { git, users } = this._sessionServiceContainer || SessionContainer.instance();
		const codeStreamUser = await users.getMe();

		const isConnected = this._isConnected(codeStreamUser);
		if (!isConnected) {
			ContextLogger.warn("getFileLevelTelemetry: not connected", {
				filePath,
			});
			return {
				error: <NRErrorResponse>{
					isConnected: isConnected,
					error: {
						message: "Not connected to New Relic",
						type: "NOT_CONNECTED",
					},
				},
			};
		}

		const repoForFile = await git.getRepositoryByFilePath(filePath);
		if (!repoForFile?.id) {
			ContextLogger.warn("getFileLevelTelemetry: no repo for file", {
				filePath,
			});
			return {};
		}

		try {
			const { entityCount } = await this._getEntityCount();
			if (entityCount < 1) {
				ContextLogger.log("getFileLevelTelemetry: no NR1 entities");
				return {};
			}
		} catch (ex) {
			if (ex instanceof GraphqlNrqlError) {
				const type = this._errorTypeMapper(ex);
				Logger.warn(`getFileLevelTelemetry error ${type}`, {
					filePath,
				});
				return {
					error: <NRErrorResponse>{
						error: {
							message: ex.message,
							type,
						},
					},
				};
			}
			return {};
		}

		const remotes = await repoForFile.getWeightedRemotesByStrategy("prioritizeUpstream", undefined);
		const remote = remotes.map(_ => _.rawUrl)[0];

		let relativeFilePath = relative(repoForFile.path, filePath);
		if (relativeFilePath[0] !== sep) {
			relativeFilePath = join(sep, relativeFilePath);
		}

		// See if the git repo is associated with NR1
		const observabilityRepo = await this._getObservabilityEntityRepos(repoForFile.id);
		if (!observabilityRepo) {
			ContextLogger.warn("getFileLevelTelemetry: no observabilityRepo");
			return {};
		}
		if (!observabilityRepo.entityAccounts?.length) {
			ContextLogger.warn("getFileLevelTelemetry: no entityAccounts");
			return {
				error: <NRErrorResponse>{
					repo: {
						id: repoForFile.id,
						name: this._getRepoName(repoForFile),
						remote: remote,
					},
					error: {
						message: "",
						type: "NOT_ASSOCIATED",
					},
				},
			};
		}

		const entity = this._getGoldenSignalsEntity(codeStreamUser!, observabilityRepo);
		return {
			result: {
				entity,
				relativeFilePath,
				observabilityRepo,
				repoForFile,
				remote,
			},
		};
	}

	async getFileLevelTelemetryWithSpanLookup(
		languageId: LanguageId,
		newRelicAccountId: number,
		newRelicEntityGuid: string,
		relativeFilePath: string,
		request: GetFileLevelTelemetryRequest,
		resolutionMethod: "filePath" | "locator" | "hybrid"
	) {
		// get a list of file-based method telemetry
		const spanResponse =
			(await this.getSpans({
				languageId,
				newRelicAccountId,
				newRelicEntityGuid,
				codeFilePath: relativeFilePath,
				locator: request.locator,
				resolutionMethod,
			})) || [];

		const spans = this.applyLanguageFilter(spanResponse, languageId);

		const groupedByTransactionName = spans ? _groupBy(spans, _ => _.name) : {};
		const metricTimesliceNames = Object.keys(groupedByTransactionName);

		request.options = request.options || {};

		const queryArgs: MetricQueryRequest = {
			newRelicAccountId,
			newRelicEntityGuid,
			metricTimesliceNames,
		};
		const [averageDurationResponse, sampleSizeResponse, errorRateResponse] = await Promise.all([
			request.options.includeAverageDuration && metricTimesliceNames?.length
				? this.getMethodAverageDuration(queryArgs, languageId)
				: undefined,
			metricTimesliceNames?.length ? this.getMethodSampleSize(queryArgs, languageId) : undefined,

			request.options.includeErrorRate && metricTimesliceNames?.length
				? this.getMethodErrorCount(queryArgs, languageId)
				: undefined,
		]);

		// Consolidate throughput per method
		const sampleSizeMap = new Map<string, { metric?: number; span?: number }>();
		if (sampleSizeResponse) {
			sampleSizeResponse.actor.account.spans.results.forEach((e: any) => {
				sampleSizeMap.set(e.metricTimesliceName, { span: e.sampleSize });
			});
			sampleSizeResponse.actor.account.metrics.results.forEach((e: any) => {
				if (!sampleSizeMap.has(e.metricTimesliceName)) {
					sampleSizeMap.set(e.metricTimesliceName, {});
				}
				const sampleSize = sampleSizeMap.get(e.metricTimesliceName);
				sampleSize!.metric = e.sampleSize;
			});
		}

		const durationsMetric = averageDurationResponse?.actor?.account?.metrics;
		const durationsSpan = averageDurationResponse?.actor?.account?.spans;
		const durationsConsolidated = [];
		const errorCountsMetric = errorRateResponse?.actor?.account?.metrics;
		const errorCountsSpan = errorRateResponse?.actor?.account?.spans;
		const errorRatesConsolidated = [];
		const sampleSizesMetric = sampleSizeResponse?.actor?.account?.metrics;
		const sampleSizesSpan = sampleSizeResponse?.actor?.account?.spans;
		const sampleSizesConsolidated = [];
		for (const methodName of sampleSizeMap.keys()) {
			const sampleSizeInfo = sampleSizeMap.get(methodName);
			const sampleSizeMetricValue = sampleSizeInfo?.metric || 0;
			const sampleSizeSpanValue = sampleSizeInfo?.span || 0;
			const canUseMetric = true; // sampleSizeMetric > 30;
			const canUseSpan = true; // sampleSizeSpan > 30;
			// prefer metric if it can be used (min 1rpm) and it's at least 80% of span throughput
			const preferMetric = canUseMetric && sampleSizeMetricValue / sampleSizeSpanValue > 0.8;

			let duration;
			let errorRate;
			let sampleSize;
			if (preferMetric && canUseMetric) {
				const sampleSizeMetric = sampleSizesMetric?.results?.find((_: any) =>
					isSameMethod(_.metricTimesliceName, methodName)
				);
				const durationMetric = durationsMetric?.results?.find((_: any) =>
					isSameMethod(_.metricTimesliceName, methodName)
				);
				const errorCountMetric = errorCountsMetric?.results?.find((_: any) =>
					isSameMethod(_.metricTimesliceName, methodName)
				);
				if (sampleSizeMetric) {
					sampleSize = {
						...sampleSizeMetric,
						source: "metric",
					};
				}
				duration = durationMetric;
				if (errorCountMetric != undefined) {
					errorRate = {
						...errorCountMetric,
						errorRate: errorCountMetric.errorCount / sampleSizeMetricValue,
					};
				}
			}
			if (canUseSpan && (!preferMetric || !duration)) {
				const sampleSizeSpan = sampleSizesSpan?.results?.find((_: any) =>
					isSameMethod(_.metricTimesliceName, methodName)
				);
				const durationSpan = durationsSpan?.results?.find((_: any) =>
					isSameMethod(_.metricTimesliceName, methodName)
				);
				const errorCountSpan = errorCountsSpan?.results?.find((_: any) =>
					isSameMethod(_.metricTimesliceName, methodName)
				);
				if (sampleSizeSpan) {
					sampleSize = {
						...sampleSizeSpan,
						source: "span",
					};
				}
				duration = durationSpan;
				if (errorCountSpan) {
					errorRate = {
						...errorCountSpan,
						errorRate: errorCountSpan.errorCount / sampleSizeSpanValue,
					};
				}
			}

			if (sampleSize) {
				sampleSizesConsolidated.push(sampleSize);
			}
			if (duration) {
				durationsConsolidated.push(duration);
			}
			if (errorRate) {
				errorRatesConsolidated.push(errorRate);
			}
		}

		// FIXME deduplicate
		if (averageDurationResponse) {
			averageDurationResponse.actor.account.nrql = {
				results: durationsConsolidated,
				metadata:
					averageDurationResponse.actor.account.metrics.metadata ||
					averageDurationResponse.actor.account.extrapolations.metadata,
			};
			averageDurationResponse.actor.account.nrql.results = this.addMethodName(
				groupedByTransactionName,
				averageDurationResponse.actor.account.nrql.results,
				languageId
			).filter(_ => _ !== null && _.functionName);

			if (request?.locator?.functionName) {
				averageDurationResponse.actor.account.nrql.results =
					averageDurationResponse.actor.account.nrql.results.filter(
						(r: any) => r.functionName === request?.locator?.functionName
					);
			}
		}

		if (errorRateResponse) {
			errorRateResponse.actor.account.nrql = {
				results: errorRatesConsolidated,
				metadata:
					errorRateResponse.actor.account.metrics.metadata ||
					errorRateResponse.actor.account.extrapolations.metadata,
			};
			errorRateResponse.actor.account.nrql.results = this.addMethodName(
				groupedByTransactionName,
				errorRateResponse.actor.account.nrql.results,
				languageId
			).filter(_ => _ !== null && _.functionName);
			if (request?.locator?.functionName) {
				errorRateResponse.actor.account.nrql.results =
					errorRateResponse.actor.account.nrql.results.filter(
						(r: any) => r.functionName === request?.locator?.functionName
					);
			}
		}

		if (sampleSizeResponse) {
			sampleSizeResponse.actor.account.nrql = {
				results: sampleSizesConsolidated,
				metadata:
					sampleSizeResponse.actor.account.metrics.metadata ||
					sampleSizeResponse.actor.account.extrapolations.metadata,
			};
			sampleSizeResponse.actor.account.nrql.results = this.addMethodName(
				groupedByTransactionName,
				sampleSizeResponse.actor.account.nrql.results,
				languageId
			).filter(_ => _ !== null && _.functionName);
			if (request?.locator?.functionName) {
				sampleSizeResponse.actor.account.nrql.results =
					sampleSizeResponse.actor.account.nrql.results.filter(
						(r: any) => r.functionName === request?.locator?.functionName
					);
			}
		}
		return { spans, averageDurationResponse, sampleSizeResponse, errorRateResponse };
	}

	addMethodName(
		groupedByTransactionName: Index<Span[]>,
		metricTimesliceNames: MetricTimeslice[],
		languageId: LanguageId
	): EnhancedMetricTimeslice[] {
		return metricTimesliceNames.reduce<EnhancedMetricTimeslice[]>((enhTimslices, _) => {
			const additionalMetadata: AdditionalMetadataInfo = {};
			const metadata =
				groupedByTransactionName[this.timesliceNameMap(languageId, _.metricTimesliceName)];
			if (metadata) {
				["code.lineno", "traceId", "transactionId", "code.namespace", "code.function"].forEach(
					_ => {
						// TODO this won't work for lambdas
						if (_) {
							additionalMetadata[_ as keyof AdditionalMetadataInfo] = (metadata[0] as any)[_];
						}
					}
				);
			}

			let functionInfo: FunctionInfo | undefined = undefined;
			const codeNamespace = additionalMetadata["code.namespace"];
			const codeFunction = additionalMetadata["code.function"];
			switch (languageId) {
				case "ruby":
					functionInfo = this.parseRubyFunctionCoordinates(_.metricTimesliceName, codeNamespace);
					break;
				case "python":
					functionInfo = this.parsePythonFunctionCoordinates(_.metricTimesliceName);
					break;
				case "csharp":
					if (codeNamespace && codeFunction) {
						functionInfo = this.parseCSharpFunctionCoordinates(codeNamespace, codeFunction);
					}
					break;
				case "java":
				case "kotlin":
				case "go":
				case "php":
				case "javascript":
				case "typescript":
				case "typescriptreact":
				case "javascriptreact":
					functionInfo = {
						functionName: additionalMetadata["code.function"],
						className: additionalMetadata["code.namespace"],
					};
					break;
			}

			if (!functionInfo) {
				return enhTimslices;
			}

			let { className, functionName, namespace } = functionInfo;

			// Use Agent provided function name if available
			if (additionalMetadata["code.function"] && additionalMetadata["code.function"]?.length > 0) {
				functionName = additionalMetadata["code.function"];
			}

			if (namespace) {
				additionalMetadata["code.namespace"] = namespace;
			}

			enhTimslices.push({
				..._,
				metadata: additionalMetadata,
				namespace: additionalMetadata["code.namespace"],
				className,
				functionName,
			});
			return enhTimslices;
		}, []);
	}

	parseCSharpFunctionCoordinates(namespace: string, functionName: string): FunctionInfo {
		const split = namespace.split(".");
		const className = split[split.length - 1];
		const theNamespace = split.slice(0, split.length - 1).join(".");
		return {
			className,
			namespace: theNamespace,
			functionName: functionName,
		};
	}

	parsePythonFunctionCoordinates(coord: string): FunctionInfo {
		const indexOfColon = coord.indexOf(":");
		let functionName = indexOfColon > -1 ? coord.slice(indexOfColon + 1) : undefined;
		let className: string | undefined = undefined;
		if (functionName) {
			const indexOfDot = functionName ? functionName.indexOf(".") : -1;
			if (indexOfDot > -1) {
				// account for a className here
				const split = functionName.split(".");
				functionName = split.pop();
				if (split.length) {
					className = split.pop();
				}
			}
		} else if (coord.indexOf(".") > -1) {
			functionName = coord.split(".").pop();
		}
		return {
			functionName,
			className,
			namespace: undefined,
		};
	}

	parseRubyFunctionCoordinates(coord: string, namespace?: string): FunctionInfo {
		if (coord.startsWith("Controller/")) {
			const functionName = coord.split("/").pop();
			const className = namespace;
			return {
				functionName,
				className,
			};
		}

		if (coord.startsWith("MessageBroker/ActiveJob")) {
			let myNamespace, className;
			if (namespace?.includes("::")) {
				[myNamespace, className] = namespace.split("::");
			} else {
				className = namespace;
			}
			return {
				namespace: myNamespace,
				className,
			};
		}

		if (!coord.includes("::")) {
			if (namespace?.includes("::")) {
				const [myNamespace, className] = namespace.split("::");
				return {
					namespace: myNamespace,
					className,
					functionName: coord,
				};
			}
			const parts = coord.split("/");
			if (parts.length > 1) {
				const functionName = parts.pop();
				const className = parts.pop();
				return {
					className,
					functionName,
				};
			} else {
				return {};
			}
		}

		const match = /\/(\w+)::(\w+)\/(\w+)/.exec(coord);
		if (!match) return {};
		return {
			namespace: match[1],
			className: match[2],
			functionName: match[3],
		};
	}

	timesliceNameMap(languageId: LanguageId, timesliceName: string): string {
		if (languageId === "python" || languageId === "csharp") {
			return timesliceName
				.replace("Errors/WebTransaction/", "")
				.replace("WebTransaction/", "")
				.replace("OtherTransaction/", "");
		} else {
			return timesliceName;
		}
	}

	private applyLanguageFilter(spans: Span[], languageId: LanguageId): Span[] {
		switch (languageId) {
			case "ruby":
				// MessageBroker is a top level message broker for ruby - there is a separate function level span that we show
				return spans
					.filter(span => !span.name?.startsWith("MessageBroker/"))
					.map(span => {
						if (span.name?.startsWith("Nested/Controller")) {
							span.name = span.name?.replace("Nested/", "");
						}
						return span;
					});
			default:
				return spans;
		}
	}

	async getSpans(request: SpanRequest): Promise<Span[] | undefined> {
		if (!request.codeFilePath) return undefined;
		try {
			let bestMatchingCodeFilePath;
			if (request.resolutionMethod === "hybrid") {
				bestMatchingCodeFilePath = await this.getBestMatchingCodeFilePath(
					request.newRelicAccountId,
					request.newRelicEntityGuid,
					request.codeFilePath
				);
			}

			for (const queryType of spanQueryTypes) {
				const query = generateSpanQuery(
					request.newRelicEntityGuid,
					request.resolutionMethod,
					queryType,
					request.languageId,
					bestMatchingCodeFilePath || request.codeFilePath,
					bestMatchingCodeFilePath ? undefined : request.locator
				);

				const response = await this._query(query, {
					accountId: request.newRelicAccountId!,
				});

				if (response?.actor?.account?.nrql?.results?.length) {
					Logger.log(
						`Resolved ${response?.actor?.account?.nrql?.results?.length} spans with ${queryType} query`
					);
					return response.actor.account.nrql.results;
				}
			}
		} catch (ex) {
			this._errorLogIfNotIgnored(ex, "getSpans", { request });
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
		}
		Logger.warn("getSpans none", {
			locator: request.locator,
			resolutionMethod: request.resolutionMethod,
			codeFilePath: request.codeFilePath,
			accountId: request.newRelicAccountId,
		});
		return undefined;
	}

	async getBestMatchingCodeFilePath(
		newRelicAccountId: number,
		newRelicEntityGuid: string,
		codeFilePath: string
	): Promise<string | undefined> {
		const parts = codeFilePath.split("/");
		const reverseParts = parts.slice().reverse();
		// const partialPaths = [];
		// let currentSuffix : string | undefined;
		// for (const part of reverseParts) {
		// 	const suffix = currentSuffix ? "/" + currentSuffix : "";
		// 	const partialPath = part + suffix;
		// 	partialPaths.push(partialPath);
		// 	currentSuffix = partialPath;
		// }
		// const inClause = partialPaths.map(_ => `'${_}'`).join(",");
		const filename = parts[parts.length - 1];
		const nrql =
			`FROM Span SELECT latest(code.filepath) as codeFilePath` +
			` WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND \`code.filepath\` LIKE '%${filename}'` +
			` FACET name SINCE 30 minutes AGO LIMIT 100`;

		const results = await this._runNrql<{
			name: string;
			codeFilePath: string;
		}>(newRelicAccountId, nrql);
		if (!results.length) return undefined;
		let maxScore = 0;
		let bestMatch;
		for (const result of results) {
			const resultParts = result.codeFilePath.split("/");
			const reverseResultParts = resultParts.slice().reverse();
			const maxLength = Math.max(reverseParts.length, reverseResultParts.length);
			let score = 0;
			for (let i = 0; i < maxLength; i++) {
				if (reverseResultParts[i] === reverseParts[i]) {
					score++;
				} else {
					break;
				}
			}
			if (score > maxScore) {
				maxScore = score;
				bestMatch = result;
			}
		}
		return bestMatch?.codeFilePath;
	}

	async getMethodSampleSize(request: MetricQueryRequest, languageId: LanguageId) {
		const query = generateMethodSampleSizeQuery(
			languageId,
			request.newRelicEntityGuid,
			request.metricTimesliceNames,
			request.codeNamespace
		);
		try {
			return this._query(query, {
				accountId: request.newRelicAccountId!,
			});
		} catch (ex) {
			this._errorLogIfNotIgnored(ex, "getMethodThroughput", {
				request,
			});
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
		}
		return undefined;
	}

	async getMethodAverageDuration(request: MetricQueryRequest, languageId: LanguageId) {
		const query = generateMethodAverageDurationQuery(
			languageId,
			request.newRelicEntityGuid,
			request.metricTimesliceNames,
			request.codeNamespace
		);
		try {
			return await this._query(query, {
				accountId: request.newRelicAccountId!,
			});
		} catch (ex) {
			this._errorLogIfNotIgnored(ex, "getMethodAverageDuration", {
				request,
			});
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
		}
		return undefined;
	}

	async getMethodErrorCount(request: MetricQueryRequest, languageId: LanguageId) {
		const query = generateMethodErrorRateQuery(
			languageId,
			request.newRelicEntityGuid,
			request.metricTimesliceNames,
			request.codeNamespace
		);
		try {
			return this._query(query, {
				accountId: request.newRelicAccountId!,
			});
		} catch (ex) {
			this._errorLogIfNotIgnored(ex, "getMethodErrorRate", { request });
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
		}
		return undefined;
	}

	getResolutionMethod(languageId: LanguageId): ResolutionMethod {
		switch (languageId) {
			case "go":
			case "csharp":
			case "java":
			case "kotlin":
				return "locator";
			case "php":
				return "hybrid";
			default:
				return "filePath";
		}
	}
}

function isSameMethod(
	method1: string,
	method2: string,
	language: LanguageId | undefined = undefined
) {
	if (method1 === method2) return true;

	// probably need some language-specific logic here
	const method1Parts = method1.split("/");
	const method2Parts = method2.split("/");
	return method1Parts[method1Parts.length - 1] === method2Parts[method2Parts.length - 1];
}

// Use type guard so that list of languages can be defined once and shared with union type LanguageId
function isSupportedLanguage(value: string): value is LanguageId {
	const language = supportedLanguages.find(validLanguage => validLanguage === value);
	return !!language;
}

const supportedLanguages = [
	"python",
	"ruby",
	"csharp",
	"java",
	"kotlin",
	"go",
	"php",
	"javascript",
	"javascriptreact",
	"typescript",
	"typescriptreact",
] as const;

export type LanguageId = typeof supportedLanguages[number];

export type EnhancedMetricTimeslice = MetricTimeslice & {
	className?: string;
	functionName?: string;
	metadata: AdditionalMetadataInfo;
	namespace?: string;
};
