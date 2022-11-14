import { DocumentMarker, MarkerNotLocated } from "codestream-common/agent-protocol";

import { Index } from "../common";

export interface DocumentMarkersState extends Index<(DocumentMarker | MarkerNotLocated)[]> {}

export enum DocumentMarkersActionsType {
	SaveForFile = "@documentMarkers/SaveForFile",
	SaveOneForFile = "@documentMarkers/SaveOne",
}
