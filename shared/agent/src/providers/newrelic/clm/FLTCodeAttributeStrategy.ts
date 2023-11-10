"use strict";

import { FLTStrategy } from "./FLTStrategy";
import { GetFileLevelTelemetryRequest } from "@codestream/protocols/agent";
import { INewRelicProvider } from "../../newrelic";
import { groupBy as _groupBy } from "lodash-es";
import { AdditionalMetadataInfo, FunctionInfo, MetricTimeslice, Span } from "../newrelic.types";
import { generateSpanQuery, spanQueryTypes } from "../spanQuery";
import { Logger } from "../../../logger";
import { GraphqlNrqlError } from "../../newrelic.types";
import { generateMethodSampleSizeQuery } from "../methodSampleSizeQuery";
import { EnhancedMetricTimeslice, LanguageId } from "./clmManager";
import { generateMethodAverageDurationQuery } from "../methodAverageDurationQuery";
import { generateMethodErrorRateQuery } from "../methodErrorRateQuery";
import { Index } from "@codestream/utils/types";

export type MethodAverageDurationResponse = {
	actor: {
		account: {
			metrics: {
				metadata: {
					timeWindow: {
						begin: number;
						end: number;
					};
				};
				results: any; // TODO not any
			};
			spans: {
				metadata: {
					timeWindow: {
						begin: number;
						end: number;
					};
				};
				results: [
					{
						facet: string[];
						averageDuration: number;
					},
				];
			};
			nrql: any; // TODO not any - this is not part of the response so maybe shouldn't be here
			extrapolations: any; // TODO not any
		};
	};
};

export function keyFromFacet(facet: string[]) {
	return facet.join(":");
}

export function facetFromKey(key: string) {
	return key.split(":");
}

export type MetricSpanCount = {
	metric?: number;
	span?: number;
};

class SampleSizeHolder {
	private sampleSizeMap = new Map<string, MetricSpanCount>();

	set(metricFacet: string[], value: MetricSpanCount) {
		this.sampleSizeMap.set(keyFromFacet(metricFacet), value);
	}

	has(metricFacet: string[]) {
		return this.sampleSizeMap.has(keyFromFacet(metricFacet));
	}

	get(metricFacet: string[]) {
		return this.sampleSizeMap.get(keyFromFacet(metricFacet));
	}

	keys(): string[][] {
		return Array.from(this.sampleSizeMap.keys()).map(key => facetFromKey(key));
	}
}

export class FLTCodeAttributeStrategy implements FLTStrategy {
	constructor(
		protected entityGuid: string,
		protected accountId: number,
		protected languageId: LanguageId,
		protected relativeFilePath: string,
		protected request: GetFileLevelTelemetryRequest,
		protected resolutionMethod: "filePath" | "locator" | "hybrid",
		protected provider: INewRelicProvider
	) {}

	async execute() {
		// get a list of file-based method telemetry
		const spanResponse = await this.getSpans();

		const spans = this.applyLanguageFilter(spanResponse);
		const groupedByTransactionName = _groupBy(
			spans,
			(_: Span) => `${_.name}:${_["code.lineno"]}:${_["code.column"]}`
		);
		const metricTimesliceNames = spans.flatMap(_ => (_.name ? [_.name] : [])); // Filter out undefined without having to typecast
		const metricTimesliceKeys = Object.keys(groupedByTransactionName);
		this.request.options = this.request.options || {};

		const [averageDurationResponse, sampleSizeResponse, errorRateResponse] = await Promise.all([
			this.request.options.includeAverageDuration && metricTimesliceNames?.length
				? this.getMethodAverageDuration(metricTimesliceNames)
				: undefined,
			metricTimesliceNames?.length ? this.getMethodSampleSize(metricTimesliceNames) : undefined,

			this.request.options.includeErrorRate && metricTimesliceNames?.length
				? this.getMethodErrorCount(metricTimesliceNames)
				: undefined,
		]);

		// Consolidate throughput per method
		const sampleSizeHolder = new SampleSizeHolder();
		if (sampleSizeResponse) {
			sampleSizeResponse.actor.account.spans.results.forEach((e: any) => {
				sampleSizeHolder.set(e.facet, { span: e.sampleSize });
			});
			sampleSizeResponse.actor.account.metrics.results.forEach((e: any) => {
				if (!sampleSizeHolder.has(e.facet)) {
					sampleSizeHolder.set(e.facet, {});
				}
				const sampleSize = sampleSizeHolder.get(e.facet);
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
		for (const metricTimesliceFacet of sampleSizeHolder.keys()) {
			const sampleSizeInfo = sampleSizeHolder.get(metricTimesliceFacet);
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
					isSameMethod(_.facet, metricTimesliceFacet)
				);
				const durationMetric = durationsMetric?.results?.find((_: any) =>
					isSameMethod(_.facet, metricTimesliceFacet)
				);
				const errorCountMetric = errorCountsMetric?.results?.find((_: any) =>
					isSameMethod(_.facet, metricTimesliceFacet)
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
					isSameMethod(_.facet, metricTimesliceFacet)
				);
				const durationSpan = durationsSpan?.results?.find((_: any) =>
					isSameMethod(_.facet, metricTimesliceFacet)
				);
				const errorCountSpan = errorCountsSpan?.results?.find((_: any) =>
					isSameMethod(_.facet, metricTimesliceFacet)
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
			const addedMethodName = this.addMethodName(
				groupedByTransactionName,
				averageDurationResponse.actor.account.nrql.results
			);
			const addedMethodNameFiltered = addedMethodName.filter(_ => _ !== null && _.functionName);
			averageDurationResponse.actor.account.nrql.results = addedMethodNameFiltered;

			if (this.request?.locator?.functionName) {
				averageDurationResponse.actor.account.nrql.results =
					averageDurationResponse.actor.account.nrql.results.filter(
						(r: any) => r.functionName === this.request?.locator?.functionName
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
				errorRateResponse.actor.account.nrql.results
			).filter(_ => _ !== null && _.functionName);
			if (this.request?.locator?.functionName) {
				errorRateResponse.actor.account.nrql.results =
					errorRateResponse.actor.account.nrql.results.filter(
						(r: any) => r.functionName === this.request?.locator?.functionName
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
				sampleSizeResponse.actor.account.nrql.results
			).filter(_ => _ !== null && _.functionName);
			if (this.request?.locator?.functionName) {
				sampleSizeResponse.actor.account.nrql.results =
					sampleSizeResponse.actor.account.nrql.results.filter(
						(r: any) => r.functionName === this.request?.locator?.functionName
					);
			}
		}
		const response = {
			averageDuration: averageDurationResponse?.actor?.account?.nrql?.results || [],
			sampleSize: sampleSizeResponse?.actor?.account?.nrql?.results || [],
			errorRate: errorRateResponse?.actor?.account?.nrql?.results || [],
		};
		return response;
	}

	async getSpans(): Promise<Span[]> {
		if (!this.relativeFilePath) return [];
		try {
			let bestMatchingCodeFilePath;
			if (this.resolutionMethod === "hybrid") {
				bestMatchingCodeFilePath = await this.getBestMatchingCodeFilePath();
			}

			for (const queryType of spanQueryTypes) {
				const query = generateSpanQuery(
					this.entityGuid,
					this.resolutionMethod,
					queryType,
					this.languageId,
					bestMatchingCodeFilePath || this.relativeFilePath,
					bestMatchingCodeFilePath ? undefined : this.request.locator
				);

				const response = await this.provider.query(query, {
					accountId: this.accountId!,
				});

				if (response?.actor?.account?.nrql?.results?.length) {
					Logger.log(
						`Resolved ${response?.actor?.account?.nrql?.results?.length} spans with ${queryType} query`
					);
					return response.actor.account.nrql.results;
				}
			}
		} catch (ex) {
			this.provider.errorLogIfNotIgnored(ex, "getSpans", { request: this.request });
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
		}
		Logger.warn("getSpans none", {
			locator: this.request.locator,
			resolutionMethod: this.resolutionMethod,
			relativeFilePath: this.relativeFilePath,
			accountId: this.accountId,
		});
		return [];
	}

	private async getBestMatchingCodeFilePath(): Promise<string | undefined> {
		const parts = this.relativeFilePath.split("/");
		const reverseParts = parts.slice().reverse();
		const filename = parts[parts.length - 1];
		const nrql =
			`FROM Span SELECT latest(code.filepath) as codeFilePath` +
			` WHERE \`entity.guid\` = '${this.entityGuid}' AND \`code.filepath\` LIKE '%${filename}'` +
			` FACET name SINCE 30 minutes AGO LIMIT 100`;

		const results = await this.provider.runNrql<{
			name: string;
			codeFilePath: string;
		}>(this.accountId, nrql);
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

	async getMethodSampleSize(metricTimesliceNames: string[]) {
		const query = generateMethodSampleSizeQuery(
			this.languageId,
			this.entityGuid,
			metricTimesliceNames
		);
		try {
			return this.provider.query(query, {
				accountId: this.accountId,
			});
		} catch (ex) {
			this.provider.errorLogIfNotIgnored(ex, "getMethodThroughput", {
				request: this.request,
			});
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
		}
		return undefined;
	}

	async getMethodAverageDuration(
		metricTimesliceNames: string[]
	): Promise<MethodAverageDurationResponse | undefined> {
		const query = generateMethodAverageDurationQuery(
			this.languageId,
			this.entityGuid,
			metricTimesliceNames
		);
		try {
			return await this.provider.query(query, {
				accountId: this.accountId!,
			});
		} catch (ex) {
			this.provider.errorLogIfNotIgnored(ex, "getMethodAverageDuration", {
				request: this.request,
			});
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
		}
		return undefined;
	}

	async getMethodErrorCount(metricTimesliceNames: string[]) {
		const query = generateMethodErrorRateQuery(
			this.languageId,
			this.entityGuid,
			metricTimesliceNames
		);
		try {
			return this.provider.query(query, {
				accountId: this.accountId,
			});
		} catch (ex) {
			this.provider.errorLogIfNotIgnored(ex, "getMethodErrorRate", { request: this.request });
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
		}
		return undefined;
	}

	private applyLanguageFilter(spans: Span[]): Span[] {
		switch (this.languageId) {
			case "ruby":
				// MessageBroker is a top level message broker for ruby - there is a separate function level span that we show
				return spans
					.filter(
						span =>
							!span.name?.startsWith("MessageBroker/") &&
							!span.name?.startsWith("ActiveJob/Async/Queue/Produce/")
					)
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

	addMethodName(
		groupedByTransactionName: Index<Span[]>,
		metricTimesliceNames: MetricTimeslice[]
	): EnhancedMetricTimeslice[] {
		return metricTimesliceNames.reduce<EnhancedMetricTimeslice[]>((enhTimslices, _) => {
			const additionalMetadata: AdditionalMetadataInfo = {};
			const facetKey = `${this.timesliceNameMap(_.facet[0])}:${_.facet[1]}:${_.facet[2]}`;
			const metadata = groupedByTransactionName[facetKey];
			if (metadata) {
				[
					"tags.commit",
					"code.lineno",
					"code.column",
					"traceId",
					"transactionId",
					"code.namespace",
					"code.function",
				].forEach(_ => {
					// TODO this won't work for lambdas
					if (_) {
						additionalMetadata[_ as keyof AdditionalMetadataInfo] = (metadata[0] as any)[_];
					}
				});
			}

			let functionInfo: FunctionInfo | undefined = undefined;
			const codeNamespace = additionalMetadata["code.namespace"];
			const codeFunction = additionalMetadata["code.function"];
			const commit = additionalMetadata["tags.commit"];
			switch (this.languageId) {
				case "ruby":
					functionInfo = this.parseRubyFunctionCoordinates(_.facet[0], codeNamespace);
					break;
				case "python":
					functionInfo = this.parsePythonFunctionCoordinates(_.facet[0]);
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
						lineno: additionalMetadata["code.lineno"]
							? Number(additionalMetadata["code.lineno"])
							: undefined,
						column: additionalMetadata["code.column"]
							? Number(additionalMetadata["code.column"])
							: undefined,
						commit,
					};
					break;
			}

			if (!functionInfo) {
				return enhTimslices;
			}

			let { className, functionName, namespace, lineno, column } = functionInfo;

			// Use Agent provided function name if available
			if (additionalMetadata["code.function"] && additionalMetadata["code.function"]?.length > 0) {
				functionName = additionalMetadata["code.function"];
			}

			if (namespace) {
				additionalMetadata["code.namespace"] = namespace;
			}

			const enhTimeslice = {
				..._,
				metadata: additionalMetadata,
				namespace: additionalMetadata["code.namespace"],
				className,
				functionName,
				lineno,
				column,
				commit,
			};
			enhTimslices.push(enhTimeslice);
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

	timesliceNameMap(timesliceName: string): string {
		if (this.languageId === "python" || this.languageId === "csharp") {
			return timesliceName
				.replace("Errors/WebTransaction/", "")
				.replace("WebTransaction/", "")
				.replace("OtherTransaction/", "");
		} else {
			return timesliceName;
		}
	}
}

function isSameMethod(
	method1: string[],
	method2: string[],
	language: LanguageId | undefined = undefined
) {
	const method1Key = keyFromFacet(method1);
	const method2Key = keyFromFacet(method2);
	// Span name, code.linno and code.column are same
	if (method1Key === method2Key) return true;

	// probably need some language-specific logic here
	const [spanName1, lineNo1, colNo1] = method1;
	const [spanName2, lineNo2, colNo2] = method2;
	const method1Parts = spanName1.split("/");
	const method2Parts = spanName2.split("/");
	return (
		method1Parts[method1Parts.length - 1] === method2Parts[method2Parts.length - 1] &&
		lineNo1 === lineNo2 &&
		colNo1 === colNo2
	);
}
