import fs from "fs";
import path from "path";

import {
	ReportBreadcrumbRequest,
	ReportBreadcrumbRequestType,
	ReportMessageRequest,
	ReportMessageRequestType,
	WebviewErrorRequest,
	WebviewErrorRequestType,
} from "@codestream/protocols/agent";
import { CSStackTraceInfo } from "@codestream/protocols/api";
import convert from "convert-source-map";
import * as NewRelic from "newrelic";
import StackMapper, { Callsite } from "stack-mapper";
import { Parser } from "./managers/stackTraceParsers/javascriptStackTraceParser";
import { lsp, lspHandler, Strings } from "./system";
import Cache from "timed-cache";
import os from "os";
import { Container, SessionContainer } from "./container";
import md5 = Strings.md5;

interface IErrorReporterProvider {
	reportMessage(request: ReportMessageRequest): void;
	reportBreadcrumb(request: ReportBreadcrumbRequest): void;
	webviewError(request: WebviewErrorRequest): void;
}

@lsp
export class ErrorReporter {
	private readonly _errorProviders: IErrorReporterProvider[];

	constructor() {
		this._errorProviders = [new NewRelicErrorReporterProvider()];
	}

	@lspHandler(ReportMessageRequestType)
	reportMessage(request: ReportMessageRequest) {
		this._errorProviders.forEach(_ => _.reportMessage(request));
	}

	@lspHandler(ReportBreadcrumbRequestType)
	reportBreadcrumb(request: ReportBreadcrumbRequest) {
		this._errorProviders.forEach(_ => _.reportBreadcrumb(request));
	}

	@lspHandler(WebviewErrorRequestType)
	webviewError(request: WebviewErrorRequest) {
		this._errorProviders.forEach(_ => _.webviewError(request));
	}
}

interface StackTraceInfo {
	stackTraceInfo: CSStackTraceInfo;
	callsite: Callsite[];
}

const STACK_INDENT = "    ";

const WEB_SOURCE_MAP = "index.js.map";

const WEB_JS_FILENAME = "index.js";

class NewRelicErrorReporterProvider implements IErrorReporterProvider {
	private readonly stackMapper?: StackMapper.StackMapper;
	private _errorCache = new Cache<void>({
		defaultTtl: 900 * 1000, // 15 minutes
	});

	constructor() {
		try {
			const webSourceMap = path.resolve(__dirname, WEB_SOURCE_MAP);
			if (!fs.existsSync(webSourceMap)) {
				console.warn(`${WEB_SOURCE_MAP} not found at ${webSourceMap}`);
				return;
			}
			const sourceMapContents = fs.readFileSync(webSourceMap, "utf8");
			if (!sourceMapContents) {
				console.warn(`Unable to load ${webSourceMap}`);
				return;
			}
			const theSm = convert.fromJSON(sourceMapContents).sourcemap;
			theSm.file = WEB_JS_FILENAME;
			this.stackMapper = StackMapper(theSm);
			console.log(`Loaded ${webSourceMap} mapper`);
		} catch (e) {
			console.error(e);
			return;
		}
	}

	private parseStackString(stackString: string): StackTraceInfo {
		// Parse stack trace string to get line / column / file / method, etc.
		const stackTraceInfo = Parser(stackString);
		const callsite: Callsite[] = [];
		// Convert to a type that source-mapper understands
		for (const stackLine of stackTraceInfo.lines) {
			if (!stackLine.line || !stackLine.column) {
				callsite.push({ filename: "<anonymous>", line: 1, column: 1 });
			} else {
				callsite.push({
					filename: WEB_JS_FILENAME, // Has to match sourcemap filename
					line: stackLine.line,
					column: stackLine.column,
				});
			}
		}
		return { stackTraceInfo, callsite };
	}

	// Re-create the stack trace format as passed in from webview
	private callsiteToStackString(parsed: StackTraceInfo): string {
		const response: string[] = [];
		if (parsed.stackTraceInfo.header) {
			response.push(parsed.stackTraceInfo.header);
		}
		parsed.callsite.forEach((_, index) => {
			const method = parsed.stackTraceInfo.lines[index].method;
			if (_.filename === "<anonymous>" && method) {
				response.push(`${STACK_INDENT}at ${method} (${_.filename})`);
			} else {
				const methodFormatted = method !== "<unknown>" ? ` ${method} ` : " ";
				response.push(`${STACK_INDENT}at${methodFormatted}(${_.filename}:${_.line}:${_.column})`);
			}
		});
		return response.join("\n");
	}

	// If source is webview, use source map to resolve original filename / lines
	private resolveWebStackTrace(request: ReportMessageRequest): Error | string | undefined {
		if (
			request.source === "webview" &&
			request.type === "error" &&
			request.error &&
			this.stackMapper
		) {
			try {
				const error: Error =
					request.error instanceof Error ? request.error : (JSON.parse(request.error) as Error);
				if (!error.stack) {
					return request.error;
				}
				const stackTraceInfo = this.parseStackString(error.stack);
				// Use the sourcemap to resolve original files / lines
				const frames = this.stackMapper.map(stackTraceInfo.callsite);
				error.stack = this.callsiteToStackString({
					stackTraceInfo: stackTraceInfo.stackTraceInfo,
					callsite: frames,
				});

				return error;
			} catch (e) {
				console.error(e);
				return request.error;
			}
		} else {
			return request.error;
		}
	}

	private hashError(request: ReportMessageRequest): string {
		let hash: string | undefined;
		if (request.error) {
			if (typeof request.error === "object") {
				hash = JSON.stringify(request.error);
			} else {
				hash = request.error;
			}
		} else {
			hash = request.message;
		}
		return md5(hash ?? "");
	}

	private createNewRelicCustomAttributes() {
		try {
			const sessionContainer = SessionContainer.isInitialized()
				? SessionContainer.instance()
				: undefined;
			const session = sessionContainer?.session ?? {
				teamId: "",
				userId: "",
				email: "",
				environment: "",
			};
			const container = Container.isInitialized() ? Container.instance() : undefined;
			const agentOptions = container?.agent.agentOptions;
			return {
				csEnvironment: session.environment,
				email: session?.email,

				extensionBuildEnv: agentOptions?.extension?.buildEnv,
				extensionVersion: agentOptions?.extension?.version,
				// this is used in Errors Inbox
				"service.version": agentOptions?.extension?.version,

				ideDetail: agentOptions?.ide?.detail,
				ideName: agentOptions?.ide?.name,
				ideVersion: agentOptions?.ide?.version,

				platform: os.platform(),
				proxySupport: agentOptions?.proxySupport,
				serverUrl: agentOptions?.serverUrl,
				teamId: session.teamId || "",
				userId: session.userId || "",
			};
		} catch (ex) {
			console.warn(`createNewRelicCustomAttributes error - ${ex.message}`);
		}
		return {};
	}

	reportMessage(request: ReportMessageRequest) {
		if (!request.error && !request.message) return;

		request.error = this.resolveWebStackTrace(request);

		const cacheKey = this.hashError(request);

		if (this._errorCache.get(cacheKey)) {
			console.warn("Ignoring duplicate error", {
				key: cacheKey,
			});
			return;
		}

		this._errorCache.put(cacheKey);

		try {
			let error: Error | undefined = undefined;
			let stack;
			if (request.error) {
				if (typeof request.error === "string") {
					const deserializedError = JSON.parse(request.error as string) as {
						message: string;
						stack: any;
					};
					error = new Error(deserializedError.message);
					// eventually setting the stack _should_ show in NR...
					error.stack = stack = deserializedError.stack;
				} else {
					error = request.error as Error;
				}
			} else if (request.message) {
				error = new Error(request.message);
			}
			if (!error) {
				console.warn("Failed to create error for reportMessage", {
					request,
				});
				return;
			}

			NewRelic.noticeError(error, {
				...((this.createNewRelicCustomAttributes() as any) || {}),
				extra:
					typeof request.extra === "object" ? JSON.stringify(request.extra) : request.extra || "",
				type: request.type,
				source: request.source || "agent",
				stack: stack || undefined,
			});
		} catch (ex) {
			console.warn("Failed to reportMessage", {
				error: ex,
			});
		}
	}

	webviewError(request: WebviewErrorRequest): void {
		// try {
		// 	NewRelic.noticeError(new Error(request.error.message), {
		// 		...this.agent.createNewRelicCustomAttributes,
		// 		stack: request.error.stack
		// 	});
		// } catch (e) {
		// 	console.warn(e);
		// }
		if (this.stackMapper) {
			// console.log(`=== stack before ${request.error.stack}`);
			const stackTraceInfo = this.parseStackString(request.error.stack);
			// Use source map to resolve original filename / lines
			const frames = this.stackMapper.map(stackTraceInfo.callsite);
			// Convert back to stack string blob
			request.error.stack = this.callsiteToStackString({
				stackTraceInfo: stackTraceInfo.stackTraceInfo,
				callsite: frames,
			});
		}

		console.log(`Webview error: ${request.error.message}\n${request.error.stack}`);
	}

	reportBreadcrumb(request: ReportBreadcrumbRequest) {
		// noop
	}
}
