"use strict";
import { Disposable } from "vscode";
import { CodeStreamSession } from "../api/session";
import { WebviewEditor } from "webviews/webviewEditor";

export class EditorController implements Disposable {
	private _disposable: Disposable | undefined;

	constructor(
		public readonly session: CodeStreamSession,
		private _editor?: WebviewEditor
	) {}

	dispose() {
		this._disposable && this._disposable.dispose();
	}
}
