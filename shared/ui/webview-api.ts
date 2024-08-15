import {
	TelemetryRequestType,
	GetAnonymousIdRequestType,
	TelemetryData,
	TelemetryEventName,
} from "@codestream/protocols/agent";
import { URI } from "vscode-uri";

import { NotificationType, RequestType } from "vscode-jsonrpc";
import {
	HostDidChangeActiveEditorNotification,
	HostDidChangeActiveEditorNotificationType,
	HostDidChangeEditorSelectionNotification,
	HostDidChangeEditorSelectionNotificationType,
	HostDidChangeEditorVisibleRangesNotification,
	HostDidChangeEditorVisibleRangesNotificationType,
	NewCodemarkNotification,
	NewCodemarkNotificationType,
	NewReviewNotification,
	NewReviewNotificationType,
} from "./ipc/webview.protocol";
import { Disposable, shortUuid } from "./utils";
import {
	IpcHost,
	isIpcRequestMessage,
	isIpcResponseMessage,
	WebviewIpcMessage,
} from "@codestream/webview/ipc/webview.protocol.common";
import { HistoryCounter } from "@codestream/utils/system/historyCounter";
import { logError } from "@codestream/webview/logger";
import { roundDownExponentially } from "@codestream/utils/system/math";

type NotificationParamsOf<NT> = NT extends NotificationType<infer N, any> ? N : never;
export type RequestParamsOf<RT> = RT extends RequestType<infer R, any, any, any> ? R : never;
export type RequestResponseOf<RT> = RT extends RequestType<any, infer R, any, any> ? R : never;

type Listener<NT extends NotificationType<any, any> = NotificationType<any, any>> = (
	event: NotificationParamsOf<NT>
) => void;

const DEFAULT_ALERT_THRESHOLD_SECONDS = 20;
const DEFAULT_TIMEOUT_THRESHOLD_SECONDS = 60;

class StaleRequestGroup {
	private _oldestDate: number | undefined = undefined;
	private _deleteKeys: string[] = [];

	get deleteKeys() {
		return this._deleteKeys;
	}

	get oldestDate() {
		return this._oldestDate;
	}

	addRequest(requestId: string, timestamp: number) {
		this._deleteKeys.push(requestId);
		if (!this._oldestDate) {
			this._oldestDate = timestamp;
		} else if (timestamp < this._oldestDate) {
			this._oldestDate = timestamp;
		}
	}
}

const normalizeNotificationsMap = new Map<
	NotificationType<any, any>,
	(listener: Listener) => Listener
>([
	[
		HostDidChangeActiveEditorNotificationType,
		listener => (e: HostDidChangeActiveEditorNotification) => {
			if (e.editor) {
				e.editor.uri = URI.parse(e.editor.uri).toString(true);
			}
			return listener(e);
		},
	],
	[
		HostDidChangeEditorSelectionNotificationType,
		listener => (e: HostDidChangeEditorSelectionNotification) => {
			e.uri = URI.parse(e.uri).toString(true);
			return listener(e);
		},
	],
	[
		HostDidChangeEditorVisibleRangesNotificationType,
		listener => (e: HostDidChangeEditorVisibleRangesNotification) => {
			e.uri = URI.parse(e.uri).toString(true);
			return listener(e);
		},
	],
	[
		NewCodemarkNotificationType,
		listener => (e: NewCodemarkNotification) => {
			e.uri = e.uri ? URI.parse(e.uri).toString(true) : undefined;
			return listener(e);
		},
	],
	[
		NewReviewNotificationType,
		listener => (e: NewReviewNotification) => {
			e.uri = e.uri ? URI.parse(e.uri).toString(true) : undefined;
			return listener(e);
		},
	],
]);

function normalizeListener<NT extends NotificationType<any, any>>(
	type: NT,
	listener: (event: NotificationParamsOf<NT>) => void
): (event: NotificationParamsOf<NT>) => void {
	const normalize = normalizeNotificationsMap.get(type);
	return normalize ? normalize(listener) : listener;
}

class EventEmitter {
	private listenersByEvent = new Map<string, Listener[]>();

	on<NT extends NotificationType<any, any>>(
		eventType: NT,
		listener: Listener<NT>,
		thisArgs?: any
	): Disposable {
		// Because we can't trust the uri format from the host, we need to normalize the uris in all notifications originating from the host
		listener = normalizeListener(
			eventType,
			thisArgs !== undefined ? listener.bind(thisArgs) : listener
		);

		const listeners = this.listenersByEvent.get(eventType.method) || [];
		listeners.push(listener);
		this.listenersByEvent.set(eventType.method, listeners);
		return {
			dispose: () => {
				const listeners = this.listenersByEvent.get(eventType.method)!.filter(l => l !== listener);
				this.listenersByEvent.set(eventType.method, listeners);
			},
		};
	}

	emit(eventName: string, body: any) {
		const listeners = this.listenersByEvent.get(eventName);
		if (listeners == null || listeners.length === 0) return;

		setTimeout(() => {
			for (const listener of listeners) {
				try {
					listener(body);
				} catch {
					// Don't let unhandle errors in a listener break others
				}
			}
		}, 0);
	}
}

let sequence = 0;

export function nextId() {
	if (sequence === Number.MAX_SAFE_INTEGER) {
		sequence = 1;
	} else {
		sequence++;
	}

	return `wv:${sequence}:${shortUuid()}:${Date.now()}`;
}

type WebviewApiRequest = {
	method: string;
	providerId?: string;
	timeoutMs?: number;
	resolve: (value?: any | PromiseLike<any>) => void;
	reject: (reason?: unknown) => void;
};

export class RequestApiManager {
	private pendingRequests = new Map<string, WebviewApiRequest>();
	private historyCounter = new HistoryCounter("webview", 15, 25, console.debug, true);

	constructor(enablePurge = true) {
		if (enablePurge) {
			setInterval(this.purgeStaleRequests.bind(this), 60000);
		}
	}

	private purgeStaleRequests() {
		const result = this.collectStaleRequests();
		let report = "";
		for (const [method, staleGroup] of result) {
			const oldest = staleGroup?.oldestDate
				? new Date(staleGroup.oldestDate).toISOString()
				: "unknown";
			report += `purging ${staleGroup.deleteKeys.length} stale requests for ${method} with oldest ${oldest}\n`;
			for (const key of staleGroup.deleteKeys) {
				const pending = this.get(key);
				if (pending) {
					this.delete(key);
					pending.reject("agent request timed out");
				}
			}
		}
		if (report) {
			logError(report);
		}
	}

	public collectStaleRequests(): Map<string, StaleRequestGroup> {
		const now = Date.now();
		const staleRequests = new Map<string, StaleRequestGroup>();
		for (const [key, value] of this.pendingRequests) {
			const parts = key.split(":");
			if (parts.length < 3) {
				continue;
			}
			const timestamp = parseInt(parts[3]);
			const timeAgoMs = (now - timestamp) / 1000;
			if (timeAgoMs > (value.timeoutMs ?? DEFAULT_TIMEOUT_THRESHOLD_SECONDS)) {
				const staleGroup = staleRequests.get(value.method) ?? new StaleRequestGroup();
				staleRequests.set(value.method, staleGroup);
				staleGroup.addRequest(key, timestamp);
			}
		}
		return staleRequests;
	}

	public get(key: string): WebviewApiRequest | undefined {
		return this.pendingRequests.get(key);
	}

	public delete(key: string): boolean {
		return this.pendingRequests.delete(key);
	}

	public set(key: string, value: WebviewApiRequest): Map<string, WebviewApiRequest> {
		const identifier = value.providerId ? `${value.method}:${value.providerId}` : value.method;
		const count = this.historyCounter.countAndGet(identifier);
		// A rounded error allows the count to stay the same and the duplicate error suppression to work in the agent
		const rounded = roundDownExponentially(count, DEFAULT_ALERT_THRESHOLD_SECONDS);
		if (count > DEFAULT_ALERT_THRESHOLD_SECONDS && identifier != "codestream/reporting/message") {
			logError(new Error(`More than ${rounded} calls pending for ${identifier}`));
		}
		return this.pendingRequests.set(key, value);
	}
}

declare function acquireCodestreamHost(): IpcHost;

let _host: IpcHost;

const findHost = (): IpcHost => {
	try {
		if (!_host) {
			_host = acquireCodestreamHost();
		}
		return _host;
	} catch (e) {
		throw new Error("Host needs to provide global `acquireCodestreamHost` function");
	}
};

export class HostApi extends EventEmitter {
	private apiManager = new RequestApiManager();
	private port: IpcHost;

	private static _hostApiInstance: HostApi;
	static get instance(): HostApi {
		if (this._hostApiInstance === undefined) {
			this._hostApiInstance = new HostApi(findHost());
		}
		return this._hostApiInstance;
	}

	protected constructor(port: any) {
		super();
		this.port = port;

		port.onmessage = ({ data }: { data: WebviewIpcMessage }) => {
			// For accurate debug logging use structuredClone but mind the high memory usage
			// const dataSnapshot = structuredClone(data);
			const dataSnapshot = data;
			if (isIpcResponseMessage(data)) {
				const pending = this.apiManager.get(data.id);
				if (!pending) {
					console.debug(
						`received response from host for ${data.id}; unable to find a pending request`,
						dataSnapshot
					);

					return;
				}

				console.debug(
					`received response from host for ${data.id}; found pending request: ${pending.method}`,
					dataSnapshot
				);
				if (data.error != null) {
					if (!data.error.toString().includes("maintenance mode")) pending.reject(data.error);
				} else pending.resolve(data.params);

				this.apiManager.delete(data.id);

				return;
			}

			if (isIpcRequestMessage(data)) {
				// TODO: Handle requests from the host
				debugger;
				return;
			}

			console.debug(`received notification ${data.method} from host`, dataSnapshot.params);
			this.emit(data.method, data.params);
		};
	}

	notify<NT extends NotificationType<any, any>>(type: NT, params: NotificationParamsOf<NT>): void {
		const payload = {
			method: type.method,
			params: params,
		};
		this.port.postMessage(payload);
		console.debug(`notification ${type.method} sent to host`, payload);
	}

	send<RT extends RequestType<any, any, any, any>>(
		type: RT,
		params: RequestParamsOf<RT>,
		options?: { alternateReject?: (error) => {}; timeoutMs?: number }
	): Promise<RequestResponseOf<RT>> {
		const id = nextId();

		return new Promise((resolve, reject) => {
			reject = (options && options.alternateReject) || reject;
			const providerId: string | undefined = params?.providerId ? params.providerId : undefined;
			this.apiManager.set(id, {
				resolve,
				reject,
				method: type.method,
				providerId,
				timeoutMs: options?.timeoutMs,
			});

			const payload = {
				id,
				method: type.method,
				params: params,
			};
			this.port.postMessage(payload);
			console.debug(`request ${id}:${type.method} sent to host`, payload);
		});
	}

	track(eventName: TelemetryEventName, properties?: TelemetryData) {
		this.send(TelemetryRequestType, {
			eventName,
			properties,
		});
	}

	getAnonymousId() {
		return this.send(GetAnonymousIdRequestType, {});
	}
}

export class Server {
	static get<Res = any>(url: string, paramData?: { [key: string]: any }): Promise<Res> {
		return HostApi.instance.send(new RequestType<any, Res, void, void>("codestream/api/get"), {
			url: url,
			paramData: paramData,
		});
	}

	static post<Res = any>(url: string, body?: any): Promise<Res> {
		return HostApi.instance.send(new RequestType<any, Res, void, void>("codestream/api/post"), {
			url: url,
			body: body,
		});
	}

	static put<Res = any>(url: string, body?: any): Promise<Res> {
		return HostApi.instance.send(new RequestType<any, Res, void, void>("codestream/api/put"), {
			url: url,
			body: body,
		});
	}

	static delete<Res = any>(url: string): Promise<Res> {
		return HostApi.instance.send(new RequestType<any, Res, void, void>("codestream/api/delete"), {
			url: url,
		});
	}
}
