"use strict";
import { CSMarkerIdentifier } from "codestream-common/api-protocol";
import {
	CancellationToken,
	Disposable,
	Range,
	TextDocumentContentProvider,
	Uri,
	window,
	workspace,
	WorkspaceEdit,
} from "vscode";

import { Container } from "../container";
import { Logger } from "../logger";

export class CodemarkPatchContentProvider implements TextDocumentContentProvider, Disposable {
	private readonly _disposable: Disposable;

	constructor() {
		this._disposable = Disposable.from(
			workspace.registerTextDocumentContentProvider("codestream-patch", this)
		);
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	async provideTextDocumentContent(
		uri: Uri,
		_token: CancellationToken
	): Promise<string | undefined> {
		try {
			const marker: CSMarkerIdentifier = JSON.parse(decodeURIComponent(uri.query));

			const resp = await Container.agent.documentMarkers.getDocumentFromMarker(marker);
			if (resp === undefined) {
				throw new Error(`Unable to find document for marker(${marker.id})`);
			}

			const original = await workspace.openTextDocument(uri.with({ scheme: "file", query: "" }));
			const patched = await workspace.openTextDocument({
				language: original.languageId,
				content: original.getText(),
			});

			const edit = new WorkspaceEdit();
			edit.replace(
				patched.uri,
				new Range(
					resp.range.start.line,
					resp.range.start.character,
					resp.range.end.line,
					resp.range.end.character
				),
				resp.marker.code
			);

			const result = await workspace.applyEdit(edit);
			if (!result) {
				throw new Error("Unable to apply changes to the document for comparison");
			}

			return patched.getText();
		} catch (ex) {
			Logger.error(ex, "PatchContentProvider");

			window.showErrorMessage("Unable compare the codemark with the document");
			return undefined;
		}
	}
}
