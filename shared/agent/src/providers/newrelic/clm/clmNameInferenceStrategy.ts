import {
	FileLevelTelemetryAverageDuration,
	FileLevelTelemetryErrorRate,
	FileLevelTelemetrySampleSize,
	GetFileLevelTelemetryRequest,
} from "@codestream/protocols/agent";
import { LanguageId } from "./clmManager";
import { Logger } from "../../../logger";

interface NameValue {
	name: string;
	value: number;
}

interface Anomaly {
	name: string;
	oldDuration: number;
	newDuration: number;
	ratio: number;
}

export class CLMNameInferenceStrategy {
	constructor(
		private entityGuid: string,
		private accountId: number,
		private _runNrql: <T>(accountId: number, nrql: string, timeout: number) => Promise<T[]>
	) {}

	async execute(
		languageId: LanguageId,
		relativeFilePath: string,
		request: GetFileLevelTelemetryRequest,
		resolutionMethod: "filePath" | "locator" | "hybrid"
	): Promise<
		| {
				averageDuration: FileLevelTelemetryAverageDuration[];
				errorRate: FileLevelTelemetryErrorRate[];
				sampleSize: FileLevelTelemetrySampleSize[];
		  }
		| undefined
	> {
		if (languageId != "java") {
			return;
		}

		try {
			// await this.init();
			// support multiple namespaces - this will move to the java subclass
			const namespace = (request.locator?.namespaces || [])[0];
			const metricLookup = `metricTimesliceName LIKE '%/${namespace}/%'`;
			const spanLookup = `name LIKE '%/${namespace}/%'`;
			const sampleSizesSpan = await this.getSampleSizeSpan(spanLookup);
			const sampleSizesMetric = await this.getSampleSizeMetric(metricLookup);
			const averageDurationsSpan = await this.getAverageDurationSpan(spanLookup);
			const averageDurationsMetric = await this.getAverageDurationMetric(metricLookup);
			const errorRatesSpan = await this.getErrorRateSpan(spanLookup, sampleSizesSpan);
			const errorRatesMetric = await this.getErrorRateMetric(metricLookup, sampleSizesMetric);

			const classMethodNames = new Set<string>();
			[...sampleSizesMetric, ...sampleSizesSpan].forEach(_ => {
				classMethodNames.add(_.className + "/" + _.functionName);
			});
			const sampleSize: FileLevelTelemetrySampleSize[] = [];
			const averageDuration: FileLevelTelemetryAverageDuration[] = [];
			const errorRate: FileLevelTelemetryErrorRate[] = [];
			classMethodNames.forEach(_ => {
				const [className, functionName] = _.split("/");
				const sampleSizeSpan = sampleSizesSpan.find(
					_ => _.className === className && _.functionName === functionName
				);
				const sampleSizeMetric = sampleSizesMetric.find(
					_ => _.className === className && _.functionName === functionName
				);
				if (
					sampleSizeMetric &&
					(!sampleSizeSpan || sampleSizeMetric.sampleSize / sampleSizeSpan.sampleSize >= 0.8)
				) {
					sampleSize.push(sampleSizeMetric);
					const averageDurationMetric = averageDurationsMetric.find(
						_ => _.className === className && _.functionName === functionName
					);
					if (averageDurationMetric) {
						averageDuration.push(averageDurationMetric);
					}
					const errorRateMetric = errorRatesMetric.find(
						_ => _.className === className && _.functionName === functionName
					);
					if (errorRateMetric) {
						errorRate.push(errorRateMetric);
					}
				} else if (sampleSizeSpan) {
					sampleSize.push(sampleSizeSpan);
					const averageDurationSpan = averageDurationsSpan.find(
						_ => _.className === className && _.functionName === functionName
					);
					if (averageDurationSpan) {
						averageDuration.push(averageDurationSpan);
					}
					const errorRateSpan = errorRatesSpan.find(
						_ => _.className === className && _.functionName === functionName
					);
					if (errorRateSpan) {
						errorRate.push(errorRateSpan);
					}
				}
			});

			return {
				averageDuration,
				errorRate,
				sampleSize,
			};
		} catch (ex) {
			Logger.error(ex);
			return undefined;
		}
	}

	private readonly _timeFrame = "SINCE 30 minutes AGO";

	getCommonRoots(namespaces: string[]): string[] {
		const namespaceTree = new Map<string, any>();
		for (const namespace of namespaces) {
			const parts = namespace.split(".");
			let node: Map<string, any> = namespaceTree;
			for (const part of parts) {
				if (!node.has(part)) {
					node.set(part, new Map<string, any>());
				}
				node = node.get(part);
			}
		}

		const commonRoots: string[] = [];
		namespaceTree.forEach((value: any, key: string) => {
			const parts = [key];
			let node: Map<string, any> = value;
			while (node.size === 1) {
				const onlyChild = Array.from(node.entries())[0];
				parts.push(onlyChild[0]);
				node = onlyChild[1];
			}
			commonRoots.push(parts.join("."));
		});

		return commonRoots;
	}

	private async getAverageDurationSpan(
		lookup: string
	): Promise<FileLevelTelemetryAverageDuration[]> {
		const query =
			`SELECT average(duration) * 1000 AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET name ` +
			`${this._timeFrame} LIMIT MAX`;
		const results = await this.runNrql<NameValue>(query);
		return results.map(_ => this.toFileLevelAverageDuration(_));
	}

	private async getAverageDurationMetric(
		lookup: string
	): Promise<FileLevelTelemetryAverageDuration[]> {
		const query =
			`SELECT average(newrelic.timeslice.value) * 1000 AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${this._timeFrame} LIMIT MAX`;
		const results = await this.runNrql<NameValue>(query);
		return results.map(_ => this.toFileLevelAverageDuration(_));
	}

	toFileLevelAverageDuration(record: NameValue): FileLevelTelemetryAverageDuration {
		const symbol = this.extractSymbol(record.name);
		return {
			...symbol,
			averageDuration: record.value,
			metricTimesliceName: record.name,
		};
	}

	private async getErrorRateSpan(
		lookup: string,
		sampleSizes: FileLevelTelemetrySampleSize[]
	): Promise<FileLevelTelemetryErrorRate[]> {
		const query =
			`SELECT count(*) AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this.entityGuid}' AND \`error.group.guid\` IS NOT NULL AND (${lookup}) FACET name ` +
			`${this._timeFrame} LIMIT MAX EXTRAPOLATE`;
		const results = await this.runNrql<NameValue>(query);
		return results.map(_ => this.toFileLevelErrorRate(_, sampleSizes));
	}

	private async getErrorRateMetric(
		lookup: string,
		sampleSizes: FileLevelTelemetrySampleSize[]
	): Promise<FileLevelTelemetryErrorRate[]> {
		const query =
			`SELECT count(apm.service.transaction.error.count) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${this._timeFrame} LIMIT MAX`;
		const results = await this.runNrql<NameValue>(query);
		return results.map(_ => this.toFileLevelErrorRate(_, sampleSizes));
	}

	toFileLevelErrorRate(
		record: NameValue,
		sampleSizes: FileLevelTelemetrySampleSize[]
	): FileLevelTelemetryErrorRate {
		const symbol = this.extractSymbol(record.name);
		const sampleSize = sampleSizes.find(_ => _.metricTimesliceName === record.name);
		const errorRate = sampleSize ? record.value / sampleSize.sampleSize : 0;
		return {
			...symbol,
			errorRate,
			metricTimesliceName: record.name,
		};
	}

	private async getSampleSizeSpan(lookup: string): Promise<FileLevelTelemetrySampleSize[]> {
		const query =
			`SELECT count(*) AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET name ` +
			`${this._timeFrame} LIMIT MAX`;

		const results = await this.runNrql<NameValue>(query);
		return results.map(_ => this.toFileLevelSampleSize(_, "span"));
	}

	private async getSampleSizeMetric(lookup: string): Promise<FileLevelTelemetrySampleSize[]> {
		const query =
			`SELECT count(newrelic.timeslice.value) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${this._timeFrame} LIMIT MAX`;
		const results = await this.runNrql<NameValue>(query);
		return results.map(_ => this.toFileLevelSampleSize(_, "metric"));
	}

	toFileLevelSampleSize(record: NameValue, source: string): FileLevelTelemetrySampleSize {
		const symbol = this.extractSymbol(record.name);
		return {
			...symbol,
			sampleSize: record.value,
			metricTimesliceName: record.name,
			source,
		};
	}

	private runNrql<T>(nrql: string): Promise<T[]> {
		return this._runNrql(this.accountId, nrql, 200);
	}

	private extractNamespace(spanName: string): string | undefined {
		const parts = spanName.split("/");
		const method = parts[parts.length - 1];
		const clazz = parts[parts.length - 2];
		return clazz;
	}

	private extractSymbol(spanName: string): {
		namespace?: string;
		className?: string;
		functionName: string;
	} {
		const parts = spanName.split("/");
		const method = parts[parts.length - 1];
		const clazz = parts[parts.length - 2];
		return {
			namespace: clazz, // what is this?
			className: clazz,
			functionName: method,
		};
	}
}
