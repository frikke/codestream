"use strict";
import { promises as fs } from "fs";
import {
	CancellationToken,
	Uri,
	ViewColumn,
	WebviewPanel,
	WebviewView,
	WebviewViewProvider,
	WebviewViewResolveContext,
	window
} from "vscode";
import { CodeStreamSession } from "../api/session";
import { Logger } from "../logger";

export class WebviewEditor implements WebviewViewProvider {
	public static readonly viewType = "editor.codestream";

	private readonly panel: WebviewPanel;
	private _webviewView?: WebviewView;
	private _codestreamSession: CodeStreamSession;
	private _extensionUri: Uri;

	constructor(
		public readonly session: CodeStreamSession,
		public readonly extensionUri: Uri,
		public readonly html: string
	) {
		this._codestreamSession = session;
		this._extensionUri = extensionUri;

		this.panel = window.createWebviewPanel(
			"Codestream.editor",
			"CodeStream",
			{ viewColumn: ViewColumn.One, preserveFocus: false },
			{
				retainContextWhenHidden: true,
				enableFindWidget: true,
				enableCommandUris: true,
				enableScripts: true
			}
		);

		this.panel.iconPath = Uri.joinPath(this._extensionUri, "assets/images/codestream.png");

		const pathToExt = this.panel.webview
			.asWebviewUri(Uri.file(this._extensionUri.toString()))
			.toString();

		this.panel.webview.html = html.replace(/{{root}}/g, pathToExt);
	}

	public async resolveWebviewView(
		webviewView: WebviewView,
		context: WebviewViewResolveContext,
		_token: CancellationToken
	) {
		this._webviewView = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			enableCommandUris: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = await this.getHtml();
	}

	private _html: string = "";

	public async getHtml(): Promise<string> {
		// NOTE: if you use workspace.openTextDocument, it will put the editor.html into
		// the lsp document cache, use fs.readFile instead
		if (!Logger.isDebugging && this._html) {
			return this._html;
		}

		const webviewPath = Uri.joinPath(this._extensionUri, "editor.html");

		const pathToExt = this.panel.webview
			.asWebviewUri(Uri.file(this._extensionUri.toString()))
			.toString();

		const data = await fs.readFile(webviewPath.toString(), {
			encoding: "utf8"
		});

		this._html = data.replace(/{{root}}/g, pathToExt);
		return this._html;
	}
}
