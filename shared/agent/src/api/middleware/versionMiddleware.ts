"use strict";
import { Disposable, Emitter, Event } from "vscode-languageserver";
import { Logger } from "../../logger";
import { ApiVersionCompatibility, VersionCompatibility } from "../../protocol/agent.protocol";
import { CSApiCapabilities, CSApiCapability } from "../../protocol/api.protocol.models";
import { log, Versions } from "../../system";
import {
	ApiProvider,
	CodeStreamApiMiddleware,
	CodeStreamApiMiddlewareContext
} from "../apiProvider";
import { APIServerVersionInfo } from "../codestream/apiServerVersionInfo";

export interface VersionCompatibilityChangedEvent {
	compatibility: VersionCompatibility;
	downloadUrl: string;
	version: string | undefined;
}

export interface ApiVersionCompatibilityChangedEvent {
	compatibility: ApiVersionCompatibility;
	version: string;
	missingCapabilities?: CSApiCapabilities;
}

export interface ServerCommand {
	command: string;
	data?: any;
}

export interface ExecuteServerCommandsEvent {
	commands: ServerCommand[];
	index: number;
}

export class VersionMiddlewareManager implements Disposable {
	private _onDidChangeCompatibility = new Emitter<VersionCompatibilityChangedEvent>();
	get onDidChangeCompatibility(): Event<VersionCompatibilityChangedEvent> {
		return this._onDidChangeCompatibility.event;
	}

	private _onDidChangeApiCompatibility = new Emitter<ApiVersionCompatibilityChangedEvent>();
	get onDidChangeApiCompatibility(): Event<ApiVersionCompatibilityChangedEvent> {
		return this._onDidChangeApiCompatibility.event;
	}

	private _onExecuteServerCommands = new Emitter<ExecuteServerCommandsEvent>();
	get onExecuteServerCommands(): Event<ExecuteServerCommandsEvent> {
		return this._onExecuteServerCommands.event;
	}

	private readonly _disposable: Disposable;
	private _compatibility: VersionCompatibility | undefined;
	private _apiVersion: string = "";

	constructor(private readonly _api: ApiProvider) {
		this._disposable = this._api.useMiddleware(new VersionMiddleware(this));
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	@log()
	async notify(compatibility: VersionCompatibility, url: string, version: string | undefined) {
		if (this._compatibility === compatibility) return;

		this._compatibility = compatibility;
		this._onDidChangeCompatibility.fire({
			compatibility: compatibility,
			downloadUrl: url,
			version: version
		});
	}

	@log()
	async apiVersionNotify(
		compatibility: ApiVersionCompatibility,
		version: string,
		missingCapabilities: CSApiCapabilities
	) {
		this._onDidChangeApiCompatibility.fire({
			compatibility,
			version,
			missingCapabilities
		});
	}

	@log()
	async executeServerCommands(commands: ServerCommand[], index: number) {
		this._onExecuteServerCommands.fire({ commands, index });
	}

	async setApiVersion(version: string) {
		if (version === this._apiVersion) return;
		Logger.log(
			`VersionMiddlewareManager: API version changed from ${this._apiVersion} to ${version}`
		);

		this._apiVersion = version;

		let compatibility = ApiVersionCompatibility.ApiCompatible;
		if (Versions.compare(version, APIServerVersionInfo.minimumRequired) === -1) {
			compatibility = ApiVersionCompatibility.ApiUpgradeRequired;
		} else if (Versions.compare(version, APIServerVersionInfo.minimumPreferred) === -1) {
			compatibility = ApiVersionCompatibility.ApiUpgradeRecommended;
		}

		const preferredCapabilities: { [id: string]: CSApiCapability } =
			APIServerVersionInfo.preferredCapabilities;
		const missingCapabilities = Object.keys(preferredCapabilities).reduce((capabilities, id) => {
			const capability = preferredCapabilities[id];
			if (capability.version && Versions.compare(version, capability.version) < 0) {
				(capabilities as CSApiCapabilities)[id] = capability;
			}
			return capabilities;
		}, {}) as CSApiCapabilities;

		this.apiVersionNotify(compatibility, version, missingCapabilities);
	}

	get apiVersion() {
		return this._apiVersion;
	}
}

// these are very unlikely to appear within the JSON data sent with the command
const SERVER_COMMAND_DELIMITER = "|!|";
const SERVER_COMMAND_DATA_DELIMITER = ":!:";

export class VersionMiddleware implements CodeStreamApiMiddleware {
	constructor(private _manager: VersionMiddlewareManager) {}

	get name() {
		return "Version";
	}

	async onResponse<R>(context: Readonly<CodeStreamApiMiddlewareContext>, responseJson: Promise<R>) {
		if (context.response === undefined) return;

		const apiVersion = context.response.headers.get("X-CS-API-Version") || "";
		this._manager.setApiVersion(apiVersion);

		const commands = (context.response.headers.get("X-CS-Execute-Commands") || "").split(
			SERVER_COMMAND_DELIMITER
		);
		if (commands.length > 0) {
			// the first argument is the new index once the client executes these commands
			const index = parseInt(commands.shift()!, 10);
			if (commands.length > 0) {
				const serverCommands: ServerCommand[] = commands.map(serverCommand => {
					const [command, commandData] = serverCommand.split(SERVER_COMMAND_DATA_DELIMITER);
					let data;
					if (commandData) {
						try {
							data = JSON.parse(commandData);
						} catch (e) {}
					}
					return { command, data };
				});
				this._manager.executeServerCommands(serverCommands, index);
			}
		}

		const compatibility = context.response.headers.get(
			"X-CS-Version-Disposition"
		) as VersionCompatibility | null;

		if (
			compatibility == null ||
			compatibility === VersionCompatibility.Compatible ||
			compatibility === VersionCompatibility.Unknown
		) {
			return;
		}

		if (
			(!context.response.ok && compatibility === VersionCompatibility.UnsupportedUpgradeRequired) ||
			(context.response.ok &&
				compatibility === VersionCompatibility.CompatibleUpgradeRecommended &&
				!context.url.endsWith("/login") &&
				context.url.indexOf("no-auth") === -1)
		) {
			// url checks are for trying not to fire this during the auth process
			const url =
				context.response.headers.get("X-CS-Latest-Asset-Url") || "https://www.codestream.com/";
			const version = context.response.headers.get("X-CS-Current-Version");
			void this._manager.notify(compatibility, url, version == null ? undefined : version);
		}
	}
}
