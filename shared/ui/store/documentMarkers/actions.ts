import {
	DocumentMarker,
	FetchDocumentMarkersRequestType,
	MarkerNotLocated,
} from "@codestream/protocols/agent";
import { HostApi } from "@codestream/webview/webview-api";
import { action } from "../common";
import { DocumentMarkersActionsType } from "./types";

export const reset = () => action("RESET");

export const saveDocumentMarkers = (
	uri: string,
	markers: DocumentMarker[],
	markersNotLocated: MarkerNotLocated[]
) => action(DocumentMarkersActionsType.SaveForFile, { uri, markers, markersNotLocated });

export const addDocumentMarker = (uri: string, marker: DocumentMarker) =>
	action(DocumentMarkersActionsType.SaveOneForFile, { uri, marker });

export const fetchDocumentMarkers = (uri: string) => async dispatch => {
	const response = await HostApi.instance.send(FetchDocumentMarkersRequestType, {
		textDocument: { uri },
		applyFilters: false,
	});

	if (response) {
		return dispatch(
			saveDocumentMarkers(uri, response.markers || [], response.markersNotLocated || [])
		);
	}
};
