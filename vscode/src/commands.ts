import * as paths from "path";

import { CSMarkerIdentifier, CSReviewCheckpoint } from "@codestream/protocols/api";
import {
	commands,
	Disposable,
	env,
	Range,
	Uri,
	ViewColumn,
	window,
	workspace,
	TextDocument
} from "vscode";
import {
	FileLevelTelemetryRequestOptions,
	MetricTimesliceNameMapping,
	ObservabilityAnomaly
} from "@codestream/protocols/agent";
import { SymbolLocator } from "providers/symbolLocator";

import { Editor } from "./extensions/editor";
import { openUrl } from "./urlHandler";
import { SessionSignedOutReason } from "./api/session";
import * as TokenManager from "./api/tokenManager";
import { SaveTokenReason } from "./api/tokenManager";
import { WorkspaceState } from "./common";
import { BuiltInCommands } from "./constants";
import { Container } from "./container";
import { Logger } from "./logger";
import { Command, createCommandDecorator, Strings } from "./system";
import * as csUri from "./system/uri";
import { md5 } from "@codestream/utils/system/string";
// import { md5 } from "@codestream/utils/system/string";

const commandRegistry: Command[] = [];
const command = createCommandDecorator(commandRegistry);

export interface InsertTextCommandArgs {
	text: string;
	marker: CSMarkerIdentifier;
	indentAfterInsert?: boolean;
}

export interface ApplyMarkerCommandArgs {
	marker: CSMarkerIdentifier;
}

export interface ShowMarkerDiffCommandArgs {
	marker: CSMarkerIdentifier;
}

export interface ShowReviewDiffCommandArgs {
	reviewId: string;
	checkpoint: CSReviewCheckpoint;
	repoId: string;
	path: string;
}

export interface ShowReviewLocalDiffCommandArgs {
	repoId: string;
	path: string;
	editingReviewId?: string;
	includeSaved: boolean;
	includeStaged: boolean;
	baseSha: string;
}

export interface CloseReviewDiffCommandArgs {}

export interface GotoCodemarkCommandArgs {
	source?: string;
	index: number;
}

export interface NewCodemarkCommandArgs {
	source?: string;
}

export interface NewReviewCommandArgs {
	source?: string;
}

export interface NewPullRequestCommandArgs {
	source?: string;
}

export interface OpenCodemarkCommandArgs {
	codemarkId: string;
	onlyWhenVisible?: boolean;
	sourceUri?: Uri;
	source?: string;
}

export interface OpenPullRequestCommandArgs {
	providerId: string;
	pullRequestId: string;
	// optionally open to a particular comment
	commentId?: string;
	sourceUri?: Uri;
	externalUrl?: string;
}

export interface OpenReviewCommandArgs {
	reviewId: string;
	onlyWhenVisible?: boolean;
	sourceUri?: Uri;
}

export interface ViewMethodLevelTelemetryBaseCommandArgs {
	repo?: {
		id: string;
		name: string;
		remote: string;
	};
	newRelicAccountId?: number;
	newRelicEntityGuid?: string;
	error?: {
		message?: string;
		type?: string;
	};
	languageId: string;
}

export interface ViewMethodLevelTelemetryErrorCommandArgs
	extends ViewMethodLevelTelemetryBaseCommandArgs {}

export interface ViewMethodLevelTelemetryCommandArgs
	extends ViewMethodLevelTelemetryBaseCommandArgs {
	codeNamespace: string;
	filePath: string;
	relativeFilePath: string;
	range: Range;
	functionName: string;
	methodLevelTelemetryRequestOptions?: FileLevelTelemetryRequestOptions;
	metricTimesliceNameMapping?: MetricTimesliceNameMapping;
	anomaly?: ObservabilityAnomaly;
}

export interface ExecuteNrqlCommandArgs {
	fileUri: Uri;
	text: string;
	lineNumber?: number;
	accountId?: number;
	entryPoint?: "nrql_file" | "entity_guid_finder";
}

export interface ExecuteLogCommandArgs {
	entityGuid?: string;
	lineNumber?: number;
	entryPoint?: "context_menu" | "entity_guid_finder";
	ignoreSearch?: boolean;
}

export class Commands implements Disposable {
	private readonly _disposable: Disposable;
	private readonly _symbolLocator: SymbolLocator;

	constructor() {
		this._disposable = Disposable.from(
			...commandRegistry.map(({ name, method }) =>
				commands.registerCommand(name, (...args: any[]) => method.apply(this, args))
			),
			commands.registerCommand("workbench.view.extension.codestream", () =>
				Container.sidebar.show()
			)
		);
		this._symbolLocator = new SymbolLocator();
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	@command("insertText", { showErrorMessage: "Unable to insertText" })
	async insertText(args: InsertTextCommandArgs): Promise<boolean> {
		const editor = await this.openWorkingFileForMarkerCore(args.marker);
		if (editor === undefined) return false;

		const resp = await Container.agent.documentMarkers.getDocumentFromMarker(args.marker);
		if (resp === undefined) return false;

		const line = resp.range.start.line;
		await editor.edit(builder => {
			builder.replace(new Range(line, 0, line, 0), args.text);
		});
		if (args.indentAfterInsert) {
			await Editor.selectRange(editor.document.uri, new Range(line, 0, line + 10, 0), undefined, {
				preserveFocus: false
			});
			await commands.executeCommand(BuiltInCommands.IndentSelection);
			await commands.executeCommand(BuiltInCommands.FormatSelection);
		}
		return true;
	}

	@command("applyMarker", { showErrorMessage: "Unable to open comment" })
	async applyMarker(args: ApplyMarkerCommandArgs): Promise<boolean> {
		const editor = await this.openWorkingFileForMarkerCore(args.marker);
		if (editor === undefined) return false;

		const resp = await Container.agent.documentMarkers.getDocumentFromMarker(args.marker);
		if (resp === undefined) return false;

		return editor.edit(builder => {
			builder.replace(
				new Range(
					resp.range.start.line,
					resp.range.start.character,
					resp.range.end.line,
					resp.range.end.character
				),
				resp.marker.code
			);
		});
	}

	@command("showMarkerDiff", { showErrorMessage: "Unable to open comment" })
	async showMarkerDiff(args: ShowMarkerDiffCommandArgs): Promise<boolean> {
		const resp = await Container.agent.documentMarkers.getDocumentFromMarker(args.marker);
		if (resp === undefined) return false;

		const originalUri = Uri.parse(resp.textDocument.uri);

		const markerId: CSMarkerIdentifier = {
			id: args.marker.id,
			file: args.marker.file,
			repoId: args.marker.repoId
		};
		const patchedUri = originalUri.with({
			scheme: "codestream-patch",
			query: encodeURIComponent(JSON.stringify(markerId))
		});

		const fileName = paths.basename(originalUri.fsPath);

		// Try to designate the diff view in the column to the left the webview
		// FYI, this doesn't always work, see https://github.com/Microsoft/vscode/issues/56097
		// let column = Container.sidebar.viewColumn as number | undefined;
		// if (column !== undefined) {
		// 	column--;
		// 	if (column <= 0) {
		// 		column = undefined;
		// 	}
		// }

		await commands.executeCommand(
			BuiltInCommands.Diff,
			originalUri,
			patchedUri,
			`${fileName} \u27f7 ${fileName} (patched)`,
			{
				preserveFocus: false,
				preview: true,
				viewColumn: ViewColumn.Active
			}
		);

		return true;
	}

	@command("showReviewDiff", { showErrorMessage: "Unable to display review diff" })
	async showReviewDiff(args: ShowReviewDiffCommandArgs): Promise<boolean> {
		await Container.diffContents.loadContents(
			args.reviewId,
			args.checkpoint,
			args.repoId,
			args.path
		);
		const { review } = await Container.agent.reviews.get(args.reviewId);
		let update = "";
		if (args.checkpoint && args.checkpoint > 0) {
			update = ` (Update #${args.checkpoint})`;
		}
		const viewColumn = await this.getViewColumn();
		await commands.executeCommand(
			BuiltInCommands.Diff,
			Uri.parse(
				`codestream-diff://${args.reviewId}/${args.checkpoint}/${args.repoId}/left/${args.path}`
			),
			Uri.parse(
				`codestream-diff://${args.reviewId}/${args.checkpoint}/${args.repoId}/right/${args.path}`
			),
			`${paths.basename(args.path)} @ ${Strings.truncate(review.title, 25)}${update}`,
			{ preserveFocus: false, preview: true, viewColumn: viewColumn }
		);

		return true;
	}

	@command("showReviewLocalDiff", { showErrorMessage: "Unable to display review local diff" })
	async showReviewLocalDiff(args: ShowReviewLocalDiffCommandArgs): Promise<boolean> {
		const rightVersion = args.includeSaved ? "saved" : args.includeStaged ? "staged" : "head";

		await Container.diffContents.loadContentsLocal(
			args.repoId,
			args.path,
			args.editingReviewId,
			args.baseSha,
			rightVersion
		);

		const viewColumn = await this.getViewColumn();
		await commands.executeCommand(
			BuiltInCommands.Diff,
			Uri.parse(`codestream-diff://local/undefined/${args.repoId}/left/${args.path}`),
			Uri.parse(`codestream-diff://local/undefined/${args.repoId}/right/${args.path}`),
			`${paths.basename(args.path)} review changes`,
			{ preserveFocus: false, preview: true, viewColumn: viewColumn }
		);

		return true;
	}

	@command("debugProtocol")
	async debugProtocol(args: any) {
		try {
			const query =
				(await window.showInputBox({
					value: "",
					placeHolder: "Paste a url here"
				})) || "";
			if (query) {
				Container.sidebar.handleProtocol(Uri.parse(query));
			} else {
				Logger.warn("invalid query");
			}
		} catch (ex) {
			Logger.error(ex);
		}
	}

	async showLocalDiff(args: {
		repoId: string;
		filePath: string;
		previousFilePath?: string;
		baseSha: string;
		baseBranch: string;
		headSha: string;
		headBranch: string;
		context?: {
			pullRequest: {
				providerId: string;
				id: string;
			};
		};
	}): Promise<boolean> {
		const leftData = {
			path: args.previousFilePath || args.filePath,
			repoId: args.repoId,
			baseBranch: args.baseBranch,
			headBranch: args.headBranch,
			leftSha: args.baseSha,
			rightSha: args.headSha,
			side: "left",
			context: args.context
		};

		const rightData = {
			path: args.filePath,
			previousFilePath: args.previousFilePath,
			repoId: args.repoId,
			baseBranch: args.baseBranch,
			headBranch: args.headBranch,
			leftSha: args.baseSha,
			rightSha: args.headSha,
			side: "right",
			context: args.context
		};

		const viewColumn = await this.getViewColumn();
		await commands.executeCommand(
			BuiltInCommands.Diff,
			csUri.Uris.toCodeStreamDiffUri(leftData, leftData.path),
			csUri.Uris.toCodeStreamDiffUri(rightData, args.filePath),
			`${Strings.truncate(paths.basename(args.filePath), 40)} (${Strings.truncate(
				args.baseSha,
				8,
				""
			)}) ⇔ (${Strings.truncate(args.headSha, 8, "")})`,
			{ preserveFocus: false, preview: true, viewColumn: viewColumn }
		);

		return true;
	}

	@command("closeReviewDiff", { showErrorMessage: "Unable to close review diff" })
	async closeReviewDiff(_args: CloseReviewDiffCommandArgs): Promise<boolean> {
		// @TODO: commented out, possibly causing intermittent issue where closing a
		// PR leads to an IDE error, see:
		// https://issues.newrelic.com/browse/NR-39332

		// for (const e of window.visibleTextEditors) {
		// 	const uri = Uri.parse(e.document.uri.toString(false));

		// 	if (uri.scheme === "codestream-diff") {
		// 		await window.showTextDocument(e.document, e.viewColumn);
		// 		await commands.executeCommand("workbench.action.closeActiveEditor");
		// 	}
		// }

		return true;
	}

	@command("startWork", { showErrorMessage: "Unable to start work" })
	startWork() {
		return this.startWorkRequest();
	}

	@command("newReview", { showErrorMessage: "Unable to request a review" })
	newReview(args?: NewReviewCommandArgs) {
		return this.newReviewRequest(args);
	}

	@command("showNextChangedFile", { showErrorMessage: "Unable to show next changed file" })
	showNextChangedFile() {
		return this.showNextChangedFileRequest();
	}

	@command("showPreviousChangedFile", { showErrorMessage: "Unable to show previous changed file" })
	showPreviousChangedFile() {
		return this.showPreviousChangedFileRequest();
	}

	@command("newPullRequest", { showErrorMessage: "Unable to create Pull Request" })
	newPullRequest(args?: NewPullRequestCommandArgs) {
		return this.newPullRequestRequest(args);
	}

	@command("copyPermalink", { showErrorMessage: "Unable to copy permalink" })
	async copyPermalink(_args?: NewCodemarkCommandArgs) {
		const editor = window.activeTextEditor;
		if (editor === undefined) return;

		const response = await Container.agent.documentMarkers.createPermalink(
			editor.document.uri,
			editor.selection,
			"private"
		);
		if (response === undefined) return;

		return env.clipboard.writeText(response.linkUrl);
	}

	@command("openCodemark", { showErrorMessage: "Unable to open comment" })
	async openCodemark(args: OpenCodemarkCommandArgs): Promise<void> {
		if (args === undefined) return;

		const { codemarkId: _codemarkId, ...options } = args;
		return Container.sidebar.openCodemark(args.codemarkId, { source: "source_file", ...options });
	}

	@command("openPullRequest", { showErrorMessage: "Unable to open pull request" })
	async openPullRequest(args: OpenPullRequestCommandArgs): Promise<void> {
		if (args === undefined) return;

		const trackParams: { [k: string]: any } = {
			Host: args.providerId
		};
		const editor = window.activeTextEditor;
		if (editor && editor.document.uri.scheme === "file") {
			trackParams["Comment Location"] = "Source Gutter";
		}
		if (editor && editor.document.uri.scheme === "codestream-diff") {
			trackParams["Comment Location"] = "Diff Gutter";
		}

		// Container.agent.telemetry.track("PR Comment Clicked", trackParams);

		if (args.externalUrl) {
			return openUrl(args.externalUrl);
		}
		return Container.sidebar.openPullRequest(args.providerId, args.pullRequestId, args.commentId);
	}

	@command("openReview", { showErrorMessage: "Unable to open review" })
	async openReview(args: OpenReviewCommandArgs): Promise<void> {
		if (args === undefined) return;

		const { reviewId: _reviewId, ...options } = args;
		return Container.sidebar.openReview(args.reviewId, options);
	}

	@command("signIn", { customErrorHandling: true })
	async signIn() {
		try {
			const teamId = Container.context.workspaceState.get(WorkspaceState.TeamId) as string;
			if (teamId) {
				const token = await TokenManager.get(
					Container.config.serverUrl,
					Container.config.email,
					teamId
				);
				if (!token) {
					await Container.context.workspaceState.update(WorkspaceState.TeamId, undefined);
					await Container.sidebar.show();
				} else {
					await Container.session.login(
						SaveTokenReason.SIGN_IN_COMMAND,
						Container.config.email,
						token,
						teamId
					);
				}
			}
		} catch (ex) {
			Logger.error(ex);
		}
	}

	@command("signOut")
	async signOut(
		reason = SessionSignedOutReason.UserSignedOutFromExtension,
		newServerUrl?: string,
		newEnvironment?: string
	) {
		try {
			if (reason === SessionSignedOutReason.UserSignedOutFromExtension) {
				Container.sidebar.hide();
			}
			await Container.session.logout(reason, newServerUrl, newEnvironment);
		} catch (ex) {
			Logger.error(ex);
		}
	}

	@command("toggle")
	async toggle() {
		try {
			return await Container.sidebar.toggle();
		} catch (ex) {
			Logger.error(ex);
		}
	}

	@command("viewMethodLevelTelemetry", {
		showErrorMessage: "Unable to view code-level metrics"
	})
	async viewMethodLevelTelemetry(args: string) {
		let parsedArgs;
		try {
			parsedArgs = JSON.parse(args) as ViewMethodLevelTelemetryCommandArgs;
			if (parsedArgs.error?.type === "NO_RUBY_VSCODE_EXTENSION") {
				// Container.agent.telemetry.track("MLT Language Extension Prompt", {
				// 	Language: parsedArgs.languageId
				// });
			}
			if (parsedArgs.error?.type === "NO_SPANS") {
				// no-op
				return;
			}

			if (parsedArgs.anomaly) {
				await Container.sidebar.viewAnomaly({
					anomaly: parsedArgs.anomaly,
					entityGuid: parsedArgs.newRelicEntityGuid!!
				});
			} else {
				await Container.sidebar.viewMethodLevelTelemetry(parsedArgs);
			}
		} catch (ex) {
			Logger.error(ex);
		}
	}

	@command("executeNrql")
	async executeNrql(args: ExecuteNrqlCommandArgs | Uri): Promise<void> {
		const editor = window.activeTextEditor;
		if (editor === undefined) return;

		if (args instanceof Uri) {
			args = {
				fileUri: args,
				text: ""
			};
		}

		let nrqlQuery: string | undefined = undefined;

		if (editor.selection && !editor.selection.isEmpty) {
			nrqlQuery = editor.document.getText(editor.selection);
		} else {
			if (args.text) {
				nrqlQuery = args.text;
			} else if (args.lineNumber) {
				nrqlQuery = editor.document.lineAt(args.lineNumber).text;
			}
		}
		if (!nrqlQuery) {
			// notification of some sort that we couldn't find anything to search on?
			await window.showErrorMessage("Please select a NRQL query to execute", "Dismiss");
		} else {
			const currentRepoId = Container.session.user?.preferences?.currentO11yRepoId;
			let currentEntityGuid;
			if (!args.accountId) {
				currentEntityGuid = currentRepoId
					? (Container.session?.user?.preferences?.activeO11y?.[currentRepoId] as string)
					: undefined;
			}

			await Container.panel.initializeOrShowEditor({
				panelLocation: ViewColumn.Beside,
				// UI can get the accountId based on the entityGuid (parsed)
				accountId: args.accountId,
				entityGuid: currentEntityGuid!,
				panel: "nrql",
				title: "NRQL",
				query: nrqlQuery,
				entryPoint: args.entryPoint || "nrql_file",
				hash: args.fileUri ? md5(args.fileUri.toString()) : undefined,
				ide: {
					name: "VSC"
				}
			});
		}
	}

	@command("logSearch")
	async logSearch(args: ExecuteLogCommandArgs | Uri): Promise<void> {
		const editor = window.activeTextEditor;
		if (editor === undefined) return;

		if (args instanceof Uri) {
			args = {} as ExecuteLogCommandArgs;
		}

		let searchTerm;
		if (!args.ignoreSearch) {
			searchTerm = editor.document.getText(editor.selection);

			if (!searchTerm) {
				// cursor sitting on a line, but nothing actually highlighted
				searchTerm = this.extractStringsFromLine(editor.document, editor.selection.start.line);
			} else {
				// take highlighted section minus leading/trailing quotes & spaces.
				searchTerm = searchTerm
					.trim()
					.replace(/^["'`]|["'`]$/g, "")
					.trim();
			}

			if (!searchTerm) {
				// notification of some sort that we couldn't find anything to search on?
				await window.showErrorMessage(
					"We were unable to determine the search criteria from your selection or line of code.",
					"Dismiss"
				);
				return;
			}
		}

		let currentEntityGuid: string | undefined;
		if (args?.entityGuid) {
			currentEntityGuid = args.entityGuid;
		} else {
			const currentRepoId = Container.session.user?.preferences?.currentO11yRepoId;
			currentEntityGuid = currentRepoId
				? (Container.session?.user?.preferences?.activeO11y?.[currentRepoId] as string)
				: undefined;
		}

		Container.panel.initializeOrShowEditor({
			panelLocation: ViewColumn.Active,
			entityGuid: currentEntityGuid!,
			panel: "logs",
			title: "Logs",
			query: searchTerm,
			entryPoint: args?.entryPoint || "context_menu",
			ide: {
				name: "VSC"
			}
		});
	}

	private extractStringsFromLine(document: TextDocument, lineNumber: number): string {
		const line = document.lineAt(lineNumber);

		// https://regex101.com/r/Pky4GV/6
		const matches = line.text.match(
			/"(?:[^"]|"")*(?:"|$)|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^'\\]|\\.)*`/gim
		);
		const match = matches?.[0];

		if (!match) {
			return "";
		}

		const fixed = match
			.trim()
			.replace(/\$?{.*}/g, "") // replace interpolated values - {0}, {variable2}, ${something}, ${variable23}
			.replace(/^["'`]|["'`]$/g, "") // replace leading and trailing quotes - ' / " / `
			.trim();

		return fixed;
	}

	async updateEditorCodeLens(): Promise<boolean> {
		Container.instrumentableCodeLensController.refresh();
		return true;
	}

	private async startWorkRequest() {
		await Container.sidebar.startWorkRequest(window.activeTextEditor, "Context Menu");
	}

	private async newReviewRequest(args: NewCodemarkCommandArgs = {}) {
		await Container.sidebar.newReviewRequest(
			window.activeTextEditor,
			args.source || "Context Menu"
		);
	}

	private async newPullRequestRequest(args: NewPullRequestCommandArgs = {}) {
		await Container.sidebar.newPullRequestRequest(
			window.activeTextEditor,
			args.source || "Context Menu"
		);
	}

	private async showNextChangedFileRequest() {
		await Container.sidebar.showNextChangedFile();
	}

	private async showPreviousChangedFileRequest() {
		await Container.sidebar.showPreviousChangedFile();
	}

	private async openWorkingFileForMarkerCore(marker: CSMarkerIdentifier) {
		const resp = await Container.agent.documentMarkers.getDocumentFromMarker(marker);
		if (resp === undefined || resp === null) return undefined;

		const uri = Uri.parse(resp.textDocument.uri);
		const normalizedUri = uri.toString(false);

		const editor = window.activeTextEditor;
		if (editor !== undefined && editor.document.uri.toString(false) === normalizedUri) {
			return editor;
		}

		for (const e of window.visibleTextEditors) {
			if (e.document.uri.toString(false) === normalizedUri) {
				return window.showTextDocument(e.document, e.viewColumn);
			}
		}

		// FYI, this doesn't always work, see https://github.com/Microsoft/vscode/issues/56097
		// let column = Container.sidebar.viewColumn as number | undefined;
		// if (column !== undefined) {
		// 	column--;
		// 	if (column <= 0) {
		// 		column = undefined;
		// 	}
		// }

		const document = await workspace.openTextDocument();
		return window.showTextDocument(document, {
			preserveFocus: false,
			preview: false,
			viewColumn: ViewColumn.Active
		});
	}

	private async getViewColumn(): Promise<number> {
		return ViewColumn.Active;

		// // <HACK>>
		// // sometimes the webview misrepresents what
		// // its viewColumn value is (it returns a number high than it should)
		// // try to force an editor to be active so we can get a valid
		// // webview.viewColumn later
		// try {
		// 	const editor = window.activeTextEditor;
		// 	if (editor === undefined) {
		// 		void (await commands.executeCommand(BuiltInCommands.NextEditor));
		// 		await Container.sidebar.show();
		// 	}
		// } catch {}
		// // </HACK>

		// // FYI, see showMarkerDiff() above
		// // Try to designate the diff view in the column to the left the webview
		// // FYI, this doesn't always work, see https://github.com/Microsoft/vscode/issues/56097
		// let column = Container.sidebar.viewColumn as number | undefined;

		// if (column !== undefined) {
		// 	column--;
		// 	if (column <= 0) {
		// 		column = undefined;
		// 	}
		// }
		// return column || ViewColumn.Active;
	}
}
