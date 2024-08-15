import {
	EditorCopySymbolRequest,
	EditorCopySymbolResponse,
	EditorCopySymbolType,
	EditorReplaceSymbolRequest,
	EditorReplaceSymbolResponse,
	EditorReplaceSymbolType,
	EditorRevealRangeRequest,
	EditorRevealRangeRequestType,
	EditorRevealRangeResponse,
	EditorUndoType,
} from "@codestream/protocols/webview";
import { CodeErrorsIDEApi } from "@codestream/webview/store/codeErrors/api/CodeErrorsIDEApi";
import { HostApi } from "@codestream/webview/webview-api";

class CodeErrorsIDEApiImpl implements CodeErrorsIDEApi {
	async editorCopySymbol(request: EditorCopySymbolRequest): Promise<EditorCopySymbolResponse> {
		return HostApi.instance.send(EditorCopySymbolType, request);
	}

	async editorReplaceSymbol(
		request: EditorReplaceSymbolRequest
	): Promise<EditorReplaceSymbolResponse> {
		return HostApi.instance.send(EditorReplaceSymbolType, request);
	}

	async editorRevealRange(request: EditorRevealRangeRequest): Promise<EditorRevealRangeResponse> {
		return HostApi.instance.send(EditorRevealRangeRequestType, request);
	}

	async editorUndo(times: number): Promise<void> {
		await HostApi.instance.send(EditorUndoType, { times });
		return;
	}

	setNrAiUserId(userId: string): void {}

	setUserId(userId: string): void {}

	setApplyFixCallback(callback: () => void) {}

	setPostReplyCallback(callback: (text: string) => void) {}

	setCurrentRepoId(repoId: string): void {}
}

export const codeErrorsIDEApiImpl = new CodeErrorsIDEApiImpl();
