import { SessionContainer } from "../../container";
import { Logger } from "../../logger";
import { AgentFilterNamespacesRequestType } from "../../protocol/agent.protocol";

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

export class AnomalyDetector {
	private spanLookup = "";
	private metricLookup = "";

	constructor(
		private entityGuid: string,
		private accountId: number,
		private _runNrql: <T>(accountId: number, nrql: string, timeout: number) => Promise<T[]>
	) {}

	async init() {
		const namespaces = await this.getObservabilityAnomaliesNamespaces();
		const namespaceRoots = this.getCommonRoots(namespaces);
		this.spanLookup = namespaceRoots.map(_ => `\`code.namespace\` LIKE '${_}%'`).join(" OR ");
		this.metricLookup = namespaceRoots
			.map(_ => `\`metricTimesliceName\` LIKE '%/${_}%'`)
			.join(" OR ");
	}

	private readonly _dataTimeFrame = "SINCE 7 days AGO";
	private readonly _baselineTimeFrame = "SINCE 30 days AGO UNTIL 7 days AGO";

	async getResponseTimeAnomalies() {
		try {
			const [spanData, spanBaseline, metricData, metricBaseline] = await Promise.all([
				this.getSpanResponseTime(this._dataTimeFrame),
				this.getSpanResponseTime(this._baselineTimeFrame),
				this.getMetricResponseTime(this._dataTimeFrame),
				this.getMetricResponseTime(this._baselineTimeFrame),
			]);
			return this.formattedOutput(spanData, spanBaseline, metricData, metricBaseline);
		} catch (ex) {
			Logger.error(ex);
			return [];
		}
	}

	async getErrorRateAnomalies() {
		try {
			const [spanData, spanBaseline, metricData, metricBaseline] = await Promise.all([
				this.getSpanErrorRate(this._dataTimeFrame),
				this.getSpanErrorRate(this._baselineTimeFrame),
				this.getMetricErrorRate(this._dataTimeFrame),
				this.getMetricErrorRate(this._baselineTimeFrame),
			]);
			return this.formattedOutput(spanData, spanBaseline, metricData, metricBaseline);
		} catch (ex) {
			Logger.error(ex);
			return [];
		}
	}

	async getObservabilityAnomaliesThroughput() {
		try {
			const [spanData, spanBaseline, metricData, metricBaseline] = await Promise.all([
				this.getSpanThroughput(this._dataTimeFrame),
				this.getSpanThroughput(this._baselineTimeFrame),
				this.getMetricThroughput(this._dataTimeFrame),
				this.getMetricThroughput(this._baselineTimeFrame),
			]);
			return this.formattedOutput(spanData, spanBaseline, metricData, metricBaseline);
		} catch (ex) {
			Logger.error(ex);
			return [];
		}
	}

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

	async getObservabilityAnomaliesNamespaces(): Promise<string[]> {
		const query =
			`SELECT latest(code.namespace) AS namespace FROM Span ` +
			`WHERE \`entity.guid\` = '${this.entityGuid}' ` +
			`FACET name ${this._dataTimeFrame} LIMIT MAX`;

		const results = await this.runNrql<{
			name: string;
			namespace: string;
		}>(query);

		const uniqueNamespaces = new Set<string>();
		for (const result of results) {
			uniqueNamespaces.add(result.namespace);
		}

		const { filteredNamespaces } = await SessionContainer.instance().session.agent.sendRequest(
			AgentFilterNamespacesRequestType,
			{
				namespaces: Array.from(uniqueNamespaces),
			}
		);

		return filteredNamespaces;
	}

	private formattedOutput(
		spanData: NameValue[],
		spanBaseline: NameValue[],
		metricData: NameValue[],
		metricBaseline: NameValue[]
	) {
		const spanComparison = this.compareData(spanData, spanBaseline);
		const metricComparison = this.compareData(metricData, metricBaseline);
		const top3Span = spanComparison.slice(0, 3);
		const top3Metric = metricComparison.slice(0, 3);
		const output = [...this.formatAnomaly(top3Span), ...this.formatAnomaly(top3Metric)];
		return output;
	}

	private formatAnomaly(anomalies: Anomaly[]) {
		const output: string[] = [];
		for (const anomaly of anomalies) {
			const variation = (anomaly.ratio - 1) * 100;
			const formattedVariation = (Math.round(variation * 100) / 100).toFixed(2);
			const formattedName = anomaly.name.replace(/(^Custom\/|Java\/)/gi, "");
			const text = formattedName + (variation > 0 ? " +" : " ") + formattedVariation + "%";
			output.push(text);
		}
		return output;
	}

	private compareData(data: NameValue[], baseline: NameValue[]) {
		const comparisonMap = this.comparisonMap(data, baseline);
		const comparisonArray: {
			name: string;
			oldDuration: number;
			newDuration: number;
			ratio: number;
		}[] = [];
		comparisonMap.forEach((value, key) => {
			if (value.oldValue && value.newValue && value.ratio) {
				comparisonArray.push({
					name: key,
					oldDuration: value.oldValue,
					newDuration: value.newValue,
					ratio: value.ratio,
				});
			}
		});
		comparisonArray.sort((a, b) => a.ratio - b.ratio);
		return comparisonArray;
	}

	private comparisonMap(data: NameValue[], baseline: NameValue[]) {
		const map = new Map<string, { oldValue?: number; newValue?: number; ratio?: number }>();
		for (const d of data) {
			map.set(d.name, { newValue: d.value });
		}
		for (const b of baseline) {
			const comparison = map.get(b.name);
			if (comparison && comparison.newValue) {
				comparison.oldValue = b.value;
				comparison.ratio = comparison.newValue / comparison.oldValue;
			}
		}
		return map;
	}

	private getSpanResponseTime(timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT average(duration) * 1000 AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this.entityGuid}' AND (${this.spanLookup}) FACET name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private getMetricResponseTime(timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT average(newrelic.timeslice.value) * 1000 AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this.entityGuid}' AND (${this.metricLookup}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private getSpanErrorRate(timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT rate(count(*), 1 minute) AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this.entityGuid}' AND \`error.group.guid\` IS NOT NULL AND (${this.spanLookup}) FACET name ` +
			`${timeFrame} LIMIT MAX EXTRAPOLATE`;
		return this.runNrql(query);
	}

	private async getMetricErrorRate(timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT rate(count(apm.service.transaction.error.count), 1 minute) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this.entityGuid}' AND (${this.metricLookup}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private getSpanThroughput(timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT rate(count(*), 1 minute) AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this.entityGuid}' AND (${this.spanLookup}) FACET name ` +
			`${timeFrame} LIMIT MAX EXTRAPOLATE`;

		return this.runNrql(query);
	}

	private async getMetricThroughput(timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT rate(count(newrelic.timeslice.value), 1 minute) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this.entityGuid}' AND (${this.metricLookup}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private runNrql<T>(nrql: string): Promise<T[]> {
		return this._runNrql(this.accountId, nrql, 200);
	}
}
