import { Container } from "../../container";
import {
	CodeAttributes,
	CodeLevelMetrics,
	GetClmExperimentRequest,
	GetClmExperimentResponse,
	NameValue,
	SpanWithCodeAttrs,
} from "@codestream/protocols/agent";
import { INewRelicProvider, NewRelicProvider } from "../newrelic";
import { Logger } from "../../logger";

export class ClmExperiment {
	constructor(
		private _request: GetClmExperimentRequest,
		private _provider: INewRelicProvider,
	) {
		this._accountId = NewRelicProvider.parseId(_request.entityGuid)!.accountId;
	}

	private _dataTimeFrame = "SINCE 30 minutes AGO";
	private readonly _accountId;

	async execute(): Promise<GetClmExperimentResponse> {
		const benchmarkMetrics = await this.getBenchmarkSampleSizesMetric();
		const languageSupport = this.getLanguageSupport(benchmarkMetrics);
		if (!languageSupport) {
			return {
				codeLevelMetrics: [],
				isSupported: false,
			};
		}

		const benchmarkSpans = await this.getBenchmarkSampleSizesSpans();

		const durations = await this.getDurationMetric(this._dataTimeFrame);
		const durationsFiltered = languageSupport.filterMetrics(durations, benchmarkSpans);

		const errorCountLookup = `metricTimesliceName LIKE 'Errors/%'`;
		const errorCounts = await this.getErrorCountMetric(errorCountLookup, this._dataTimeFrame);
		const errorCountsFiltered = languageSupport.filterMetrics(errorCounts, benchmarkSpans);

		const codeLevelMetrics: CodeLevelMetrics[] = [];
		for (const duration of durationsFiltered) {
			const codeAttrs = languageSupport.codeAttrs(duration.name, benchmarkSpans);
			const metric: CodeLevelMetrics = {
				name: duration.name,
				codeAttrs,
				duration: duration.value,
			};
			codeLevelMetrics.push(metric);
		}

		try {
			const telemetry = Container.instance().telemetry;
			const event = {
				// "Total Methods": symbolStrs.size,
				"Entity GUID": this._request.entityGuid,
			};
			telemetry?.track({
				eventName: "CLM Anomalies Calculated",
				properties: event,
			});
		} catch (e) {
			Logger.warn("Error generating anomaly detection telemetry", e);
		}

		return {
			codeLevelMetrics,
			isSupported: true,
		};
	}

	private async getBenchmarkSampleSizesSpans() {
		const query =
			`SELECT ` +
			`  count(*) AS 'value', latest(\`code.filepath\`) as codeFilepath, ` +
			`  latest(\`code.function\`) as codeFunction, ` +
			`  latest(\`code.namespace\`) as codeNamespace ` +
			`FROM Span ` +
			`WHERE \`entity.guid\` = '${this._request.entityGuid}' ` +
			`FACET name ` +
			`${this._dataTimeFrame} LIMIT MAX`;

		return this.runNrql<SpanWithCodeAttrs>(query);
	}

	private async getBenchmarkSampleSizesMetric() {
		const benchmarkSampleSizesMetric = await this.getSampleSizeMetric(this._dataTimeFrame);
		return benchmarkSampleSizesMetric;
	}

	getDurationMetric(timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT average(newrelic.timeslice.value) * 1000 AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private async getErrorCountMetric(lookup: string, timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT count(apm.service.transaction.error.count) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private async getSampleSizeMetric(timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT count(newrelic.timeslice.value) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql<NameValue>(query);
	}

	extractSymbol(rawName: string) {
		const parts = rawName.split("/");
		const functionName = parts[parts.length - 1];
		const className = parts[parts.length - 2];
		return {
			className,
			functionName,
		};
	}

	extractSymbolStr(rawName: string) {
		const symbol = this.extractSymbol(rawName);
		return symbol.className + "/" + symbol.functionName;
	}

	private runNrql<T>(nrql: string): Promise<T[]> {
		return this._provider.runNrql(this._accountId, nrql, 400);
	}

	private getLanguageSupport(benchmarkMetrics: NameValue[]): LanguageSupport | undefined {
		for (const metric of benchmarkMetrics) {
			if (metric.name.indexOf("Java/") === 0) {
				return new JavaLanguageSupport();
			}
			if (metric.name.indexOf("Ruby/") === 0 || metric.name.indexOf("RubyVM/") === 0) {
				return new RubyLanguageSupport();
			}
			if (metric.name.indexOf("DotNet/") === 0) {
				return new CSharpLanguageSupport();
			}
			if (metric.name.indexOf("Python/") === 0) {
				return new PythonLanguageSupport();
			}
		}

		return undefined;
	}
}

interface LanguageSupport {
	get language(): string;

	filterMetrics(data: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[];

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes;

	displayName(codeAttrs: CodeAttributes, name: string): string;
}

class JavaLanguageSupport implements LanguageSupport {
	get language() {
		return "java";
	}

	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		const javaRE = /^Java\/(.+)\.(.+)\/(.+)/;
		const customRE = /^Custom\/(.+)\.(.+)\/(.+)/;
		const errorsRE = /^Errors\/(.+)\.(.+)\/(.+)/;
		return metrics.filter(
			m =>
				benchmarkSpans.find(s => s.name === m.name && s.codeFunction) ||
				javaRE.test(m.name) ||
				customRE.test(m.name) ||
				errorsRE.test(m.name),
		);
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const parts = name.split("/");
		const codeFunction = parts[parts.length - 1];
		const codeNamespace = parts[parts.length - 2];
		return {
			codeNamespace,
			codeFunction,
		};
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const span = benchmarkSpans.find(_ => _.name === name);
		if (span && span.codeFunction) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		if (!codeAttrs?.codeFunction) return name;
		const parts = [];
		if (codeAttrs.codeNamespace) parts.push(codeAttrs.codeNamespace);
		parts.push(codeAttrs.codeFunction);
		return parts.join("/");
	}
}

class RubyLanguageSupport implements LanguageSupport {
	get language() {
		return "ruby";
	}
	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		const controllerRE = /^Controller\/(.+)\/(.+)/;
		const nestedControllerRE = /^Nested\/Controller\/(.+)\/(.+)/;
		const datastoreStatementRE = /^Datastore\/statement\/(.+)\/(.+)/;
		const errorsRE = /^Errors\/(.+)\/(.+)/;
		return metrics.filter(
			m =>
				!(
					m.name.indexOf("Nested/Controller/") === 0 &&
					metrics.find(another => "Nested/" + another.name === m.name)
				) &&
				!(m.name.indexOf("Nested/Controller/Rack/") === 0) &&
				!(m.name.indexOf("Controller/Sinatra/") === 0) &&
				!(m.name.indexOf("Nested/Controller/Sinatra/") === 0) &&
				(benchmarkSpans.find(s => s.name === m.name && s.codeFunction) ||
					controllerRE.test(m.name) ||
					nestedControllerRE.test(m.name) ||
					datastoreStatementRE.test(m.name) ||
					errorsRE.test(m.name)),
		);
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const parts = name.split("/");
		const codeFunction = parts[parts.length - 1];
		const codeNamespace = parts[parts.length - 2];

		if (
			(parts[0] === "Nested" && parts[1] === "Controller") ||
			(parts[0] === "Errors" && parts[1] === "Controller") ||
			parts[0] === "Controller"
		) {
			const parts = codeNamespace.split("_");
			const camelCaseParts = parts.map(_ => _.charAt(0).toUpperCase() + _.slice(1));
			const controllerName = camelCaseParts.join("") + "Controller";
			return {
				codeNamespace: controllerName,
				codeFunction,
			};
		} else {
			return {
				codeNamespace,
				codeFunction,
			};
		}
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const span = benchmarkSpans.find(_ => _.name === name);
		if (span && span.codeFunction) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		if (!codeAttrs?.codeFunction) return name;
		const parts = [];
		if (codeAttrs.codeNamespace) parts.push(codeAttrs.codeNamespace);
		parts.push(codeAttrs.codeFunction);
		return parts.join("#");
	}
}

class PythonLanguageSupport implements LanguageSupport {
	get language() {
		return "python";
	}
	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		const errorPrefixRe = /^Errors\/WebTransaction\//;
		return metrics.filter(m => {
			const name = m.name.replace(errorPrefixRe, "");
			return (
				!name.startsWith("Function/flask.app:Flask.") &&
				benchmarkSpans.find(
					s =>
						s.name === name &&
						s.name.endsWith(s.codeFunction) &&
						s.codeFunction &&
						s.codeFilepath != "<builtin>",
				)
			);
		});
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const [prefix, classMethod] = name.split(":");
		const parts = classMethod.split(".");
		const codeFunction = parts.pop() || "";
		const namespacePrefix = prefix.replace("Function/", "");
		const className = parts.join(".");
		const codeNamespaceParts = [namespacePrefix];
		if (className.length) {
			codeNamespaceParts.push(className);
		}
		const codeNamespace = codeNamespaceParts.join(":");
		return {
			codeNamespace,
			codeFunction,
		};
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const errorPrefixRe = /^Errors\/WebTransaction\//;
		name = name.replace(errorPrefixRe, "");
		const span = benchmarkSpans.find(_ => _.name === name && _.name.endsWith(_.codeFunction));
		if (span && span.codeFunction) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		const errorPrefixRe = /^Errors\/WebTransaction\/Function\//;
		const functionRe = /^Function\//;
		return name.replace(errorPrefixRe, "").replace(functionRe, "");
	}
}

class CSharpLanguageSupport implements LanguageSupport {
	get language() {
		return "csharp";
	}

	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		const dotNetRE = /^DotNet\/(.+)\.(.+)\/(.+)/;
		const customRE = /^Custom\/(.+)\.(.+)\/(.+)/;
		const errorsRE = /^Errors\/(.+)\.(.+)\/(.+)/;
		return metrics.filter(
			m =>
				benchmarkSpans.find(s => s.name === m.name && s.codeFunction) ||
				dotNetRE.test(m.name) ||
				customRE.test(m.name) ||
				errorsRE.test(m.name),
		);
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const parts = name.split("/");
		const codeFunction = parts[parts.length - 1];
		const codeNamespace = parts[parts.length - 2];
		return {
			codeNamespace,
			codeFunction,
		};
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const span = benchmarkSpans.find(_ => _.name === name);
		if (span) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		if (!codeAttrs.codeFunction) return name;
		const parts = [];
		if (codeAttrs.codeNamespace) parts.push(codeAttrs.codeNamespace);
		parts.push(codeAttrs.codeFunction);
		return parts.join("/");
	}
}
