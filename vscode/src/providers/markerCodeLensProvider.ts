"use strict";
import {
	CancellationToken,
	CodeLens,
	CodeLensProvider,
	ConfigurationChangeEvent,
	Disposable,
	DocumentSelector,
	Event,
	EventEmitter,
	languages,
	TextDocument,
	Uri,
} from "vscode";
import { Strings } from "codestream-common/string";

import {
	DocMarker,
	SessionStatus,
	SessionStatusChangedEvent,
	TextDocumentMarkersChangedEvent,
} from "../api/session";
import { OpenCodemarkCommandArgs } from "../commands";
import { configuration } from "../configuration";
import { Container } from "../container";
import { Logger } from "../logger";

export class CodemarkCodeLensProvider implements CodeLensProvider, Disposable {
	static selector: DocumentSelector = { scheme: "file" };

	private readonly _onDidChangeCodeLenses = new EventEmitter<void>();
	public get onDidChangeCodeLenses(): Event<void> {
		return this._onDidChangeCodeLenses.event;
	}

	private readonly _disposable: Disposable;
	private _enabledDisposable: Disposable | undefined;

	constructor() {
		this._disposable = Disposable.from(
			Container.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this),
			configuration.onDidChange(this.onConfigurationChanged, this)
		);

		this.onConfigurationChanged(configuration.initializingChangeEvent);
	}

	dispose() {
		this._enabledDisposable && this._enabledDisposable.dispose();
		this._disposable && this._disposable.dispose();
	}

	private onConfigurationChanged(e: ConfigurationChangeEvent) {
		if (!configuration.changed(e, configuration.name("showMarkerCodeLens").value)) {
			return;
		}

		this.ensure();
	}

	private onSessionStatusChanged(e: SessionStatusChangedEvent) {
		switch (e.getStatus()) {
			case SessionStatus.SignedOut:
				this.disable();
				break;

			case SessionStatus.SignedIn:
				this.ensure();
				break;
		}
	}

	private ensure() {
		if (!Container.config.showMarkerCodeLens) {
			this.disable();

			return;
		}

		this.enable();
	}

	private disable() {
		if (this._enabledDisposable === undefined) return;

		this._onDidChangeCodeLenses.fire();
		this._enabledDisposable && this._enabledDisposable.dispose();
	}

	private enable() {
		if (this._enabledDisposable !== undefined) return;

		this._enabledDisposable = Disposable.from(
			languages.registerCodeLensProvider(CodemarkCodeLensProvider.selector, this),
			Container.session.onDidChangeTextDocumentMarkers(this.onMarkersChanged, this)
		);
	}

	private onMarkersChanged(_e: TextDocumentMarkersChangedEvent) {
		this._onDidChangeCodeLenses.fire();
	}

	async provideCodeLenses(
		document: TextDocument,
		_token: CancellationToken
	): Promise<CodeLens[] | null | undefined> {
		if (
			!Container.config.showMarkerCodeLens ||
			Container.session.status !== SessionStatus.SignedIn
		) {
			return [];
		}

		const { uri } = document;

		const markers = await this.getMarkers(uri);
		if (markers == null || markers.length === 0) return [];

		const lenses = markers.map<CodeLens>(m => {
			if (m.codemarkId == null) {
				// TODO: Add action for external content
				return new CodeLens(m.range, {
					title: `// ${m.creatorName}: ${Strings.truncate(m.summary, 60)}`,
					command: undefined!,
				});
			}

			const args: OpenCodemarkCommandArgs = {
				codemarkId: m.codemarkId,
				sourceUri: uri,
			};

			return new CodeLens(m.range, {
				title: `// ${m.creatorName}: ${Strings.truncate(m.summary, 60)}`,
				command: "codestream.openCodemark",
				arguments: [args],
			});
		});
		return lenses;
	}

	private async getMarkers(uri: Uri) {
		try {
			const response = await Container.agent.documentMarkers.fetch(uri);
			if (response == null) return undefined;

			return (
				response.markers
					// NOTE: Remove this once we support external content in the editor
					.filter(m => m.codemark != null)
					.map(m => new DocMarker(Container.session, m))
			);
		} catch (ex) {
			Logger.error(ex);
			return undefined;
		}
	}
}
