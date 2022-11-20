import { EditorContext } from "codestream-common/webview-protocol-common";

export type EditorContextState = EditorContext;

export enum EditorContextActionsType {
	SetEditorLayout = "@editorContext/SetLayout",
	SetEditorContext = "@editorContext/Set",
	AppendProcessBuffer = "@editorContext/AppendProcessBuffer",
	ClearProcessBuffer = "@editorContext/ClearProcessBuffer",
}
