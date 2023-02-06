import { Headers, RequestInit, Response } from "node-fetch";
import { CodeStreamApiMiddleware, CodeStreamApiMiddlewareContext } from "../../apiProvider";
import { Logger } from "../../../logger";
import { fetchCore } from "../../../system/fetchCore";
import { Container } from "../../../container";
import { promises as fs } from "fs";
import { URLSearchParams } from "url";
import { Objects, Strings } from "../../../system";
import { VersionInfo } from "../../../types";
import { Agent as HttpsAgent } from "https";
import HttpsProxyAgent from "https-proxy-agent";
import { Agent as HttpAgent } from "http";
import { ReportingMessageType } from "@codestream/protocols/agent";
import { ServerError } from "../../../agentError";

export class ApiClient {
	private _token: string | undefined;
	private readonly _middleware: CodeStreamApiMiddleware[] = [];

	constructor(
		public baseUrl: string,
		public readonly version: VersionInfo,
		public readonly httpsAgent: HttpsAgent | HttpsProxyAgent | HttpAgent | undefined,
		public readonly strictSSL: boolean
	) {}

	public get token(): string | undefined {
		return this._token;
	}

	public set token(value: string | undefined) {
		this._token = value;
	}

	useMiddleware(middleware: CodeStreamApiMiddleware) {
		this._middleware.push(middleware);
		return {
			dispose: () => {
				const i = this._middleware.indexOf(middleware);
				this._middleware.splice(i, 1);
			},
		};
	}

	setServerUrl(serverUrl: string) {
		this.baseUrl = serverUrl.trim();
	}

	async get<R extends object>(url: string, token?: string): Promise<R> {
		if (!token && url.indexOf("/no-auth/") === -1) token = this._token;
		return this.fetch<R>(url, { method: "GET" }, token) as Promise<R>;
	}

	async put<RQ extends object, R extends object>(
		url: string,
		body: RQ,
		token?: string
	): Promise<R> {
		if (!token && url.indexOf("/no-auth/") === -1) token = this._token;
		return this.fetch<R>(
			url,
			{
				method: "PUT",
				body: JSON.stringify(body),
			},
			token
		);
	}

	async post<RQ extends object, R extends object>(
		url: string,
		body: RQ,
		token?: string
	): Promise<R> {
		if (!token && url.indexOf("/no-auth/") === -1) token = this._token;
		return this.fetch<R>(
			url,
			{
				method: "POST",
				body: JSON.stringify(body),
			},
			token
		);
	}

	async delete<R extends object>(url: string, token?: string): Promise<R> {
		if (!token && url.indexOf("/no-auth/") === -1) token = this._token;
		let resp = undefined;
		if (resp === undefined) {
			resp = this.fetch<R>(url, { method: "DELETE" }, token) as Promise<R>;
		}
		return resp;
	}

	/*private*/
	async fetch<R extends object>(url: string, init?: RequestInit, token?: string): Promise<R> {
		const start = process.hrtime();

		const sanitizedUrl = ApiClient.sanitizeUrl(url);
		let traceResult;
		try {
			if (init !== undefined || token !== undefined) {
				if (init === undefined) {
					init = {};
				}

				if (init.headers === undefined) {
					init.headers = new Headers();
				}

				if (init.headers instanceof Headers) {
					init.headers.append("Accept", "application/json");
					init.headers.append("Content-Type", "application/json");

					if (token !== undefined) {
						init.headers.append("Authorization", `Bearer ${token}`);
					}

					init.headers.append("X-CS-Plugin-IDE", this.version.ide.name);
					init.headers.append("X-CS-Plugin-IDE-Detail", this.version.ide.detail);
					init.headers.append(
						"X-CS-Plugin-Version",
						`${this.version.extension.version}+${this.version.extension.build}`
					);
					init.headers.append("X-CS-IDE-Version", this.version.ide.version);
				}
			}

			if (this.httpsAgent !== undefined) {
				if (init === undefined) {
					init = {};
				}

				init.agent = this.httpsAgent;
			}

			const method = (init && init.method) || "GET";
			const absoluteUrl = `${this.baseUrl}${url}`;

			const context =
				this._middleware.length > 0
					? ({
							url: absoluteUrl,
							method: method,
							request: init,
					  } as CodeStreamApiMiddlewareContext)
					: undefined;

			if (context !== undefined) {
				for (const mw of this._middleware) {
					if (mw.onRequest === undefined) continue;

					try {
						await mw.onRequest(context);
					} catch (ex) {
						Logger.error(
							ex,
							`API: ${method} ${sanitizedUrl}: Middleware(${mw.name}).onRequest FAILED`
						);
					}
				}
			}

			let json: Promise<R> | undefined;
			if (context !== undefined) {
				for (const mw of this._middleware) {
					if (mw.onProvideResponse === undefined) continue;

					try {
						json = mw.onProvideResponse(context);
						if (json !== undefined) break;
					} catch (ex) {
						Logger.error(
							ex,
							`API: ${method} ${sanitizedUrl}: Middleware(${mw.name}).onProvideResponse FAILED`
						);
					}
				}
			}

			let id;
			let resp;
			let retryCount = 0;
			if (json === undefined) {
				[resp, retryCount] = await fetchCore(0, absoluteUrl, init);
				if (context !== undefined) {
					context.response = resp;
				}

				id = resp.headers.get("x-request-id");

				if (resp.ok) {
					traceResult = `API(${id}): Completed ${method} ${sanitizedUrl}`;
					json = resp.json() as Promise<R>;
				}
			}

			if (context !== undefined) {
				for (const mw of this._middleware) {
					if (mw.onResponse === undefined) continue;

					try {
						await mw.onResponse(context, json);
					} catch (ex) {
						Logger.error(
							ex,
							`API(${id}): ${method} ${sanitizedUrl}: Middleware(${mw.name}).onResponse FAILED`
						);
					}
				}
			}

			if (resp !== undefined && !resp.ok) {
				traceResult = `API(${id}): FAILED(${retryCount}x) ${method} ${sanitizedUrl}`;
				Container.instance().errorReporter.reportBreadcrumb({
					message: traceResult,
					category: "apiErrorResponse",
				});
				throw await this.handleErrorResponse(resp);
			}

			const _json = await json;

			if (Container.instance().agent.recordRequests && init) {
				const now = Date.now();
				const { method, body } = init;

				const urlForFilename = ApiClient.sanitize(
					sanitizedUrl.split("?")[0].replace(/\//g, "_").replace("_", "")
				);
				const filename = `/tmp/dump-${now}-csapi-${method}-${urlForFilename}.json`;

				const out = {
					url: url,
					request: typeof body === "string" ? JSON.parse(body) : body,
					response: _json,
				};
				const outString = JSON.stringify(out, null, 2);

				await fs.writeFile(filename, outString, { encoding: "utf8" });
				Logger.log(`Written ${filename}`);
			}

			return ApiClient.normalizeResponse(_json);
		} finally {
			Logger.log(
				`${traceResult}${
					init && init.body ? ` body=${ApiClient.sanitize(init && init.body)}` : ""
				} \u2022 ${Strings.getDurationMilliseconds(start)} ms`
			);
		}
	}

	private async handleErrorResponse(response: Response): Promise<Error> {
		let message = response.statusText;
		let data;
		if (response.status >= 400 && response.status < 500) {
			try {
				data = await response.json();
				if (data.code) {
					message += `(${data.code})`;
				}
				if (data.message) {
					message += `: ${data.message}`;
				}
				if (data.info) {
					if (data.info.name) {
						message += `\n${data.info.name || data.info}`;
					}
					if (data.message === "Validation error") {
						message += ` ${Array.from(Objects.values(data.info)).join(", ")}`;
					}
				}
			} catch {}
		}

		Container.instance().errorReporter.reportMessage({
			source: "agent",
			type: ReportingMessageType.Error,
			message: `[Server Error]: ${message}`,
			extra: {
				data,
				responseStatus: response.status,
				requestId: response.headers.get("x-request-id"),
				requestUrl: response.url,
			},
		});

		return new ServerError(message, data, response.status);
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
}
