import {
	Disposable,
	TextDocumentContentProvider,
	Uri,
	workspace,
	TextDocument,
	EventEmitter,
	Event,
} from "vscode";
import { GetReviewContentsResponse, CodeStreamDiffUriData } from "codestream-common/agent-protocol";
import { CSReviewCheckpoint } from "codestream-common/api-protocol";

import { Container } from "../container";
import { Logger } from "../logger";
import * as csUri from "../system/uri";
import { parseCSReviewDiffUrl } from "../system/uriUtil";

interface CacheValue {
	/**
	 * These come from the initial command to generate the cached content.
	 * They're stored along with the data as they're needed in certain cases
	 * to update the cached value's "contents"
	 */
	args: {
		reviewId?: string;
		repoId: string;
		path: string;
		editingReviewId?: string;
		checkpoint?: CSReviewCheckpoint;
		baseSha?: string;
		rightVersion?: string;
	};
	contents: GetReviewContentsResponse;
}

export class ReviewDiffContentProvider implements TextDocumentContentProvider, Disposable {
	private readonly _disposable: Disposable;
	private readonly _contents = new Map<string, CacheValue>();
	private readonly _textDocumentUriToRepoId = new Map<string, string>();
	private _openTextDocuments: string[] = [];

	constructor() {
		this.onDidChangeEmitter = new EventEmitter<Uri>();
		this.onDidChange = this.onDidChangeEmitter.event;
		this._disposable = Disposable.from(
			workspace.registerTextDocumentContentProvider("codestream-diff", this),
			workspace.onDidOpenTextDocument(async _ => this.onDidOpenTextDocument(_)),
			workspace.onDidSaveTextDocument(async _ => this.onDidSaveTextDocument(_)),
			workspace.onDidCloseTextDocument(async _ => this.onDidCloseTextDocument(_)),
			this.onDidChangeEmitter
		);
	}

	onDidChangeEmitter: EventEmitter<Uri>;
	onDidChange?: Event<Uri>;

	/** Tries to find path of a file relative to its "workspace"
	 * (the cache uses this filePath as part of the cache key)
	 * @param  {TextDocument} textDocument
	 */
	private getFileInfo(textDocument: TextDocument):
		| {
				relativeFilePath: string;
				workspaceFolderUriString: string;
		  }
		| undefined {
		if (!textDocument || !textDocument.uri || textDocument.uri.scheme === "codestream-diff") return;

		// is this a real file that exists in the current workspace or folder?
		const workspaceFolder = workspace.getWorkspaceFolder(textDocument.uri);
		if (workspaceFolder == null) return undefined;

		// get just the file name relative to the workspace as this is what is used in the key
		const relativeFilePath = workspace.asRelativePath(textDocument.uri, false);
		return {
			relativeFilePath,
			workspaceFolderUriString: workspaceFolder.uri.toString(),
		};
	}

	private async onDidOpenTextDocument(textDocument: TextDocument) {
		// add this textDocument uri to the list of open documents
		this._openTextDocuments.push(textDocument.uri.toString());
	}

	/**
	 * Runs after a text document is saved... this updates the diff cache
	 * @param  {TextDocument} textDocument
	 */
	private async onDidSaveTextDocument(textDocument: TextDocument) {
		// if there are no open textDocuments OR there aren't any codestream-diff documents open
		// we don't need to do any work related to getting the repoId and/or updating the cache contents
		if (
			!this._openTextDocuments.length ||
			!this._openTextDocuments.some(_ => _.indexOf("codestream-diff") === 0)
		) {
			return;
		}

		const fileInfo = this.getFileInfo(textDocument);
		if (fileInfo == null || !fileInfo.relativeFilePath || !fileInfo.workspaceFolderUriString) {
			return;
		}

		// it's impossible to map textDocument to "path" without knowing
		// which repo they belong to... get it and cache it here.
		let repoId = this._textDocumentUriToRepoId.get(fileInfo.workspaceFolderUriString);
		if (repoId == null) {
			try {
				const scmFileInfo = await Container.agent.scm.getFileInfo(textDocument.uri);
				if (!scmFileInfo || !scmFileInfo.scm) return;
				repoId = scmFileInfo.scm.repoId;
				if (!repoId) return;

				this._textDocumentUriToRepoId.set(fileInfo.workspaceFolderUriString, repoId);
			} catch (ex) {
				Logger.error(ex);
				return;
			}
		}

		for (const key of this._contents.keys()) {
			const cachedValue = this._contents.get(key);
			if (
				cachedValue &&
				cachedValue.args &&
				cachedValue.args.path === fileInfo.relativeFilePath &&
				cachedValue.args.repoId === repoId
			) {
				const current = this._contents.get(key);
				const args = current!.args;
				// set new contents
				await this.loadContentsLocal(
					args.repoId,
					args.path,
					args.editingReviewId,
					args.baseSha!,
					args.rightVersion!
				);
				// tell VSC that the content has changed, this is what actually updates the editor buffer
				this.onDidChangeEmitter.fire(
					Uri.parse(`codestream-diff://local/undefined/${args.repoId}/right/${args.path}`)
				);
				break;
			}
		}
	}

	private async onDidCloseTextDocument(textDocument: TextDocument) {
		// remove it from open documents array
		this._openTextDocuments = this._openTextDocuments.filter(
			_ => _ !== textDocument.uri.toString()
		);

		// remove from diff content cache
		const fileInfo = this.getFileInfo(textDocument);
		if (
			fileInfo != null &&
			fileInfo.relativeFilePath != null &&
			fileInfo.workspaceFolderUriString != null
		) {
			for (const key of this._contents.keys()) {
				const cachedValue = this._contents.get(key);
				const repoId = this._textDocumentUriToRepoId.get(fileInfo.workspaceFolderUriString);
				if (
					repoId &&
					cachedValue &&
					cachedValue.args &&
					cachedValue.args.path === fileInfo.relativeFilePath &&
					cachedValue.args.repoId === repoId
				) {
					this._contents.delete(key);
					break;
				}
			}
		}

		// remove from file-to-repos cache
		this._textDocumentUriToRepoId.delete(textDocument.uri.toString());
	}

	async provideTextDocumentContent(uri: Uri): Promise<string> {
		if (csUri.Uris.isCodeStreamDiffUri(uri.toString())) {
			const codeStreamDiff = csUri.Uris.fromCodeStreamDiffUri<CodeStreamDiffUriData>(
				uri.toString()
			);
			if (!codeStreamDiff) {
				throw new Error("Could not parse codestream-diff uri");
			}
			const contents = await Container.agent.scm.getFileContentsAtRevision(
				codeStreamDiff.repoId,
				codeStreamDiff.path,
				codeStreamDiff.side === "left" ? codeStreamDiff.leftSha : codeStreamDiff.rightSha
			);
			return contents.content! || "";
		}
		const csReviewDiffInfo = parseCSReviewDiffUrl(uri.toString(true));
		if (csReviewDiffInfo == null) return "";

		const { reviewId, checkpoint, repoId, version, path } = csReviewDiffInfo;
		const key = this.key(reviewId, checkpoint, repoId, path);

		const cacheValue = this._contents.get(key);
		if (cacheValue === undefined || cacheValue.contents === undefined) {
			throw new Error(`Contents not loaded for ${uri}`);
		}

		return (cacheValue.contents as any)[version] as string;
	}

	clearLocalContents(reviewIds: string[]) {
		for (const reviewId of reviewIds) {
			for (const key of this._contents.keys()) {
				const cachedValue = this._contents.get(key);
				if (cachedValue && cachedValue.args && cachedValue.args.reviewId === reviewId) {
					this._contents.delete(key);
					break;
				}
			}
		}
	}

	async loadContents(
		reviewId: string,
		checkpoint: CSReviewCheckpoint,
		repoId: string,
		path: string
	) {
		const key = this.key(reviewId, checkpoint, repoId, path);
		const cached = this._contents.get(key);

		if (cached !== undefined && cached.contents !== undefined) return cached.contents;

		const contents = await Container.agent.reviews.getContents(reviewId, checkpoint, repoId, path);
		this._contents.set(key, {
			args: {
				reviewId,
				checkpoint,
				repoId,
				path,
			},
			contents: contents,
		});

		return contents;
	}

	async loadContentsLocal(
		repoId: string,
		path: string,
		editingReviewId: string | undefined,
		baseSha: string,
		rightVersion: string
	) {
		const key = this.key("local", undefined, repoId, path);
		// TODO this might be able to be resurrected
		// const cached = this._contents.get(key);

		// if (cached !== undefined && cached.contents !== undefined) return cached.contents;

		const contents = await Container.agent.reviews.getContentsLocal(
			repoId,
			path,
			editingReviewId,
			baseSha,
			rightVersion
		);
		this._contents.set(key, {
			args: {
				repoId,
				path,
				editingReviewId,
				baseSha,
				rightVersion,
			},
			contents: contents,
		});

		return contents;
	}

	private key(reviewId: string, checkpoint: CSReviewCheckpoint, repoId: string, path: string) {
		return `${reviewId}|${checkpoint}|${repoId}|${path}`;
	}

	dispose() {
		this._disposable.dispose();
	}
}
