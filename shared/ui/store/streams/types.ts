import { CSStream } from "codestream-common/api-protocol";

import { Index } from "../common";

export interface StreamsState {
	byTeam: {
		[teamId: string]: Index<CSStream>;
	};
}

export enum StreamActionType {
	ADD_STREAMS = "ADD_STREAMS",
	BOOTSTRAP_STREAMS = "BOOTSTRAP_STREAMS",
	UPDATE_STREAM = "UPDATE_STREAM",
	REMOVE_STREAM = "REMOVE_STREAM",
}
