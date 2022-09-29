import { EditorContext } from "@codestream/protocols/webview";

export type EditorContextState = EditorContext;

export enum EditorContextActionsType {
	SetEditorLayout = "@editorContext/SetLayout",
	SetEditorContext = "@editorContext/Set",
	AppendProcessBuffer = "@editorContext/AppendProcessBuffer",
	ClearProcessBuffer = "@editorContext/ClearProcessBuffer",
}
