import { CSStream } from "codestream-common/api-protocol";

import { action } from "../common";
import { StreamActionType } from "./types";

export const reset = () => action("RESET");

export const addStreams = (streams: CSStream[]) => action(StreamActionType.ADD_STREAMS, streams);

export const updateStream = (stream: CSStream) => action(StreamActionType.UPDATE_STREAM, stream);

export const bootstrapStreams = (streams: CSStream[]) =>
	action(StreamActionType.BOOTSTRAP_STREAMS, streams);
export const remove = (streamId: string, teamId: string) =>
	action(StreamActionType.REMOVE_STREAM, { streamId, teamId });
