"use strict";
import * as fs from "fs";
import {
	CancellationToken,
	ClientCapabilities,
	Connection,
	DidChangeConfigurationNotification,
	Disposable,
	Emitter,
	Event,
	InitializedParams,
	InitializeError,
	InitializeParams,
	InitializeResult,
	NotificationHandler,
	NotificationType,
	NotificationType0,
	RequestHandler,
	RequestHandler0,
	RequestType,
	RequestType0,
	TextDocuments,
	TextDocumentSyncKind
} from "vscode-languageserver";
import { Container } from "./container";
import { DocumentManager } from "./documentManager";
import { Logger } from "./logger";
import { CodeStreamSession } from "./session";
import { AgentOptions, DidChangeDataNotificationType, LogoutReason } from "./shared/agent.protocol";
import { Disposables, Functions, log, memoize } from "./system";

export class CodeStreamAgent implements Disposable {
	private _onReady = new Emitter<void>();
	get onReady(): Event<void> {
		return this._onReady.event;
	}

	readonly documents: DocumentManager;
	rootUri: string | undefined;

	private _clientCapabilities: ClientCapabilities | undefined;
	private _disposable: Disposable | undefined;
	private readonly _logger: LspLogger;
	private _session: CodeStreamSession | undefined;
	private _signedIn: boolean = false;

	constructor(
		private readonly _connection: Connection,
		options: {
			logger?: LspLogger;
			onInitialize?: RequestHandler<InitializeParams, InitializeResult, InitializeError>;
			onInitialized?: NotificationHandler<InitializedParams>;
		} = {}
	) {
		this._connection.onInitialize(options.onInitialize || this.onInitialize.bind(this));
		this._connection.onInitialized(options.onInitialized || this.onInitialized.bind(this));

		this._logger = options.logger || new ConnectionLspLogger(this._connection);
		Logger.initialize(this);

		this.documents = new DocumentManager(new TextDocuments(), this._connection);
	}

	dispose() {
		this._disposable && this._disposable.dispose();
		this.documents.dispose();
	}

	get connection() {
		return this._connection;
	}

	get signedIn() {
		return this._signedIn;
	}

	@memoize
	get supportsConfiguration() {
		return (
			(this._clientCapabilities &&
				this._clientCapabilities.workspace &&
				!!this._clientCapabilities.workspace.configuration) ||
			false
		);
	}

	@memoize
	get supportsWorkspaces() {
		return (
			(this._clientCapabilities &&
				this._clientCapabilities.workspace &&
				!!this._clientCapabilities.workspace.workspaceFolders) ||
			false
		);
	}

	async onInitialize(e: InitializeParams) {
		try {
			const capabilities = e.capabilities;
			this._clientCapabilities = capabilities;
			this.rootUri = e.rootUri == null ? undefined : e.rootUri;

			const agentOptions = e.initializationOptions! as AgentOptions;

			Logger.level = agentOptions.traceLevel;
			if (agentOptions.isDebugging) {
				Logger.overrideIsDebugging();
			}

			// Pause for a bit to give the debugger a window of time to connect -- mainly for startup issues
			if (Logger.isDebugging) {
				void (await Functions.wait(5000));
			}

			Logger.log(
				`Agent for CodeStream v${agentOptions.extension.versionFormatted} in ${
					agentOptions.ide.name
				} (v${agentOptions.ide.version}) initializing...`
			);

			if (agentOptions.recordRequests) {
				const now = Date.now();
				const fs = require("fs");
				const filename = `/tmp/dump-${now}-agent_options.json`;
				const outString = JSON.stringify(agentOptions, null, 2);

				fs.writeFile(filename, outString, "utf8", () => {
					Logger.log(`Written ${filename}`);
				});
			}

			this._session = new CodeStreamSession(this, this._connection, agentOptions);
			const result = await this._session.login();

			return {
				capabilities: {
					textDocumentSync: TextDocumentSyncKind.Full
					// hoverProvider: true
				},
				result: result
			} as InitializeResult;
		} catch (ex) {
			// debugger;
			Logger.error(ex);
			// TODO: Probably should avoid throwing here and return better error reporting to the extension
			throw ex;
		}
	}

	async onInitialized(e: InitializedParams) {
		try {
			const subscriptions = [];

			if (this.supportsConfiguration) {
				// Register for all configuration changes
				subscriptions.push(
					await this._connection.client.register(DidChangeConfigurationNotification.type, undefined)
				);
			}

			this._disposable = Disposables.from(...subscriptions);

			this._signedIn = true;
			this._onReady.fire(undefined);
		} catch (ex) {
			// debugger;
			Logger.error(ex);
			// TODO: Probably should avoid throwing here and return better error reporting to the extension
			throw ex;
		}
	}

	async logout(reason: LogoutReason) {
		this._session!.logout(reason);
	}

	registerHandler<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;
	registerHandler<P, R, E, RO>(
		type: RequestType<P, R, E, RO>,
		handler: RequestHandler<P, R, E>
	): void;
	@log({
		args: false,
		prefix: (context, type) => `${context.prefix}(${type.method})`,
		timed: false
	})
	registerHandler(type: any, handler: any): void {
		if (Container.instance().session.recordRequests) {
			this._connection.onRequest(type, async function() {
				const now = Date.now();
				const fs = require("fs");
				const sanitize = require("sanitize-filename");
				const sanitizedURL = sanitize(type.method.replace(/\//g, "_"));
				const method = type.method;

				let result = handler.apply(null, arguments);
				if (typeof result.then === "function") {
					result = await result;
				}
				const out = {
					method: method,
					request: arguments[0],
					response: result
				};
				const outString = JSON.stringify(out, null, 2);
				const filename = `/tmp/dump-${now}-agent-${sanitizedURL}.json`;

				fs.writeFile(filename, outString, "utf8", () => {
					Logger.log(`Written ${filename}`);
				});

				return result;
			});
		} else {
			return this._connection.onRequest(type, handler);
		}
	}

	sendNotification<RO>(type: NotificationType0<RO>): void;
	sendNotification<P, RO>(type: NotificationType<P, RO>, params: P): void;
	@log({
		args: { 0: type => type.method },
		prefix: (context, type, params) =>
			`${context.prefix}(${type.method}${
				type.method === DidChangeDataNotificationType.method ? `:${params.type}` : ""
			})`
	})
	sendNotification(type: any, params?: any): void {
		return this._connection.sendNotification(type, params);
	}

	sendRequest<R, E, RO>(type: RequestType0<R, E, RO>, token?: CancellationToken): Thenable<R>;
	sendRequest<P, R, E, RO>(
		type: RequestType<P, R, E, RO>,
		params: P,
		token?: CancellationToken
	): Thenable<R>;
	@log({
		args: {
			0: type => type.method,
			1: params => (CancellationToken.is(params) ? undefined : params)
		},
		prefix: (context, type, params) =>
			`${context.prefix}(${type.method}${
				type.method === DidChangeDataNotificationType.method ? `:${params.type}` : ""
			})`
	})
	sendRequest(type: any, params?: any, token?: CancellationToken): Thenable<any> {
		if (CancellationToken.is(params)) {
			token = params;
			params = undefined;
		}

		return this._connection.sendRequest(type, params, token);
	}

	error(exception: Error): void;
	error(message: string): void;
	error(exceptionOrmessage: Error | string): void {
		this._logger.error(
			typeof exceptionOrmessage === "string" ? exceptionOrmessage : exceptionOrmessage.toString()
		);
	}

	log(message: string): void {
		this._logger.log(message);
	}

	warn(message: string): void {
		this._logger.warn(message);
	}
}

export interface LspLogger {
	log(message: string): void;
	warn(message: string): void;
	error(exception: Error): void;
	error(message: string): void;
	error(exceptionOrmessage: Error | string): void;
}

export class ConnectionLspLogger implements LspLogger {
	private readonly _connection: Connection;

	constructor(connection: Connection) {
		this._connection = connection;
	}

	log(message: string): void {
		this._connection.console.log(message);
	}

	warn(message: string): void {
		this._connection.console.warn(message);
	}

	error(exception: Error): void;
	error(message: string): void;
	error(exceptionOrmessage: Error | string): void {
		this._connection.console.error(
			typeof exceptionOrmessage === "string" ? exceptionOrmessage : exceptionOrmessage.toString()
		);
	}
}

export class FileLspLogger implements LspLogger {
	private readonly _logFile: fs.WriteStream;

	constructor(logPath: string) {
		this._logFile = fs.createWriteStream(logPath, {
			flags: "w"
		});
		this.log(`initialized log at ${logPath}`);
	}
	log(message: string): void {
		this._logFile.write(`${message}\n`);
	}
	warn(message: string): void {
		this._logFile.write(`${message}\n`);
	}
	error(exception: Error): void;
	error(message: string): void;
	error(exceptionOrmessage: Error | string): void {
		this._logFile.write(
			`${
				typeof exceptionOrmessage === "string" ? exceptionOrmessage : exceptionOrmessage.toString()
			}\n`
		);
	}
}

export class NullLspLogger implements LspLogger {
	log(message: string): void {}
	warn(message: string): void {}
	error(exception: Error): void;
	error(message: string): void;
	error(exceptionOrmessage: Error | string): void {}
}
