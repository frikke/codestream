import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import {
	GetSpanChartDataRequest,
	GetSpanChartDataRequestType,
	GetSpanChartDataResponse,
	SpanHistogramData,
	SpanHistogramDataPoint,
	SpanLineChartData,
	SpanLineChartDataValue,
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";

@lsp
export class SpansProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {}

	@lspHandler(GetSpanChartDataRequestType)
	@log()
	async getSpanChartData(request: GetSpanChartDataRequest): Promise<GetSpanChartDataResponse> {
		const [responseTime, throughput, duration] = await Promise.all([
			this.getSpanResponseTimeChartData(request),
			this.getSpanThroughputChartData(request),
			this.getSpanDurationChartData(request),
		]);
		return {
			responseTime,
			throughput,
			duration,
		};
	}

	@log()
	async getSpanResponseTimeChartData(request: GetSpanChartDataRequest): Promise<SpanLineChartData> {
		const query = [
			"SELECT average(duration.ms) as 'value'",
			"FROM Span",
			`WHERE entity.guid='${request.entityGuid}'`,
			`AND name='${request.spanName}'`,
			"FACET cases(",
			`WHERE host='${request.spanHost}' as 'thisHost',`,
			"WHERE 1=1 as 'allHosts'",
			")",
			`SINCE ${request.timeRange} AGO`,
			"TIMESERIES",
		].join(" ");
		const response = await this.graphqlClient.query<{
			actor: {
				account: {
					nrql: {
						results: (SpanLineChartDataValue & { facet: "thisHost" | "allHosts" })[];
					};
				};
			};
		}>(
			`query fetchSpanResponseTimeData($accountId:Int!) {
				actor {
					account(id: $accountId) {
						nrql(query: "${query}", timeout: 60) { nrql results }
					}
				}
			}
			`,
			{
				accountId: request.accountId,
			}
		);

		const partialData = response.actor.account.nrql.results.reduce(
			(accum, val) => {
				accum[val.endTimeSeconds * 1000] = accum[val.endTimeSeconds * 1000] || {};
				accum[val.endTimeSeconds * 1000][val.facet] = val.value
					? parseFloat(val.value.toFixed(3))
					: val.value;
				return accum;
			},
			{} as { [endTimeMs: number]: { thisHost?: number; allHosts?: number } }
		);
		return Object.keys(partialData).map(strKey => {
			const key = parseInt(strKey);
			return {
				endTimeMs: key,
				thisHost: partialData[key].thisHost,
				allHosts: partialData[key].allHosts,
			};
		});
	}

	@log()
	async getSpanThroughputChartData(request: GetSpanChartDataRequest): Promise<SpanLineChartData> {
		const query = [
			"SELECT count(*)/(uniqueCount(host or 0) + .000000001) as 'value'",
			"FROM Span",
			`WHERE entity.guid='${request.entityGuid}'`,
			`AND name='${request.spanName}'`,
			"FACET cases(",
			`WHERE host='${request.spanHost}' as 'thisHost',`,
			"WHERE 1=1 as 'allHosts'",
			")",
			`SINCE ${request.timeRange} AGO`,
			"TIMESERIES",
		].join(" ");
		const response = await this.graphqlClient.query<{
			actor: {
				account: {
					nrql: {
						results: (SpanLineChartDataValue & { facet: "thisHost" | "allHosts" })[];
					};
				};
			};
		}>(
			`query fetchSpanThroughputData($accountId:Int!) {
				actor {
					account(id: $accountId) {
						nrql(query: "${query}", timeout: 60) { nrql results }
					}
				}
			}
			`,
			{
				accountId: request.accountId,
			}
		);

		const partialData = response.actor.account.nrql.results.reduce(
			(accum, val) => {
				accum[val.endTimeSeconds * 1000] = accum[val.endTimeSeconds * 1000] || {};
				accum[val.endTimeSeconds * 1000][val.facet] = val.value
					? parseFloat(val.value.toFixed(3))
					: val.value;
				return accum;
			},
			{} as { [endTimeMs: number]: { thisHost?: number; allHosts?: number } }
		);
		return Object.keys(partialData).map(strKey => {
			const key = parseInt(strKey);
			return {
				endTimeMs: key,
				thisHost: partialData[key].thisHost,
				allHosts: partialData[key].allHosts,
			};
		});
	}

	@log()
	async getSpanDurationChartData(request: GetSpanChartDataRequest): Promise<SpanHistogramData> {
		const widthQuery = [
			"SELECT percentile(duration.ms, 95) as 'width'",
			"FROM Span",
			`WHERE entity.guid='${request.entityGuid}'`,
			`AND name='${request.spanName}'`,
			`SINCE ${request.timeRange} AGO TIMESERIES`,
		].join(" ");
		const widthResponse = await this.graphqlClient.query<{
			actor: {
				account: {
					nrql: {
						results: {
							width: {
								"95": number;
							};
						}[];
					};
				};
			};
		}>(
			`query fetchSpanDuration95thPercentile($accountId:Int!) {
				actor {
					account(id: $accountId) {
						nrql(query: "${widthQuery}", timeout: 60) { nrql results }
					}
				}
			}
			`,
			{
				accountId: request.accountId,
			}
		);
		const width = widthResponse.actor.account.nrql.results[0].width["95"];
		const histogramQuery = [
			`SELECT histogram(duration.ms, width: ${width}, buckets: 20) AS 'values'`,
			"FROM Span",
			`WHERE entity.guid='${request.entityGuid}'`,
			`AND name='${request.spanName}'`,
			`SINCE ${request.timeRange} AGO`,
		].join(" ");
		const histogramResponse = await this.graphqlClient.query<{
			actor: {
				account: {
					nrql: {
						results: {
							bucketSize: number;
							minValue: number;
							maxValue: number;
							values: number[];
						}[];
					};
				};
			};
		}>(
			`query fetchSpanDurationData($accountId:Int!) {
				actor {
					account(id: $accountId) {
						nrql(query: "${histogramQuery}", timeout: 60) { nrql results }
					}
				}
			}
			`,
			{
				accountId: request.accountId,
			}
		);
		const results = histogramResponse.actor.account.nrql.results[0];
		const retVal: SpanHistogramDataPoint[] = [];
		for (const i in results.values) {
			const startValue = results.minValue + parseInt(i) * results.bucketSize;
			const endValue = startValue + results.bucketSize;
			const durationRange = `${startValue.toPrecision(3)} to ${endValue.toPrecision(3)}`;
			retVal[i] = {
				durationRange,
				count: results.values[i],
			};
		}
		return retVal;
	}
}
