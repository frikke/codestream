import { EditorSelectRangeRequestType } from "@codestream/sidebar/ipc/sidebar.protocol";
import { HostApi } from "@codestream/sidebar/sidebar-api";
import { action } from "../common";
import { EditorContextActionsType, EditorContextState } from "./types";
import { EditorLayout, EditorSelection } from "@codestream/sidebar/ipc/sidebar.protocol.common";

export const reset = () => action("RESET");

export const setEditorContext = (payload: Partial<EditorContextState>) =>
	action(EditorContextActionsType.SetEditorContext, payload);

export const setEditorLayout = (payload: Partial<EditorLayout>) =>
	action(EditorContextActionsType.SetEditorLayout, payload);

export const changeSelection = (uri: string, range: EditorSelection) => async dispatch => {
	await HostApi.instance.send(EditorSelectRangeRequestType, {
		uri,
		selection: range,
		preserveFocus: true,
	});

	dispatch(setEditorContext({ textEditorSelections: [range] }));
};

export const appendProcessBuffer = (payload: { text: string }) =>
	action(EditorContextActionsType.AppendProcessBuffer, payload);

export const clearProcessBuffer = (payload: {}) =>
	action(EditorContextActionsType.ClearProcessBuffer, payload);
