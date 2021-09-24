import {
	GetNewRelicErrorGroupRequestType,
	PixieDynamicLoggingRequest,
	PixieDynamicLoggingRequestType
} from "@codestream/protocols/agent";
import { HostApi } from "@codestream/webview/webview-api";
import { action } from "../common";
import { DynamicLoggingActionsTypes } from "./types";

export const reset = () => action("RESET");

export const addDynamicLogging = (whatever: { status?: string; results: any[] }) =>
	action(DynamicLoggingActionsTypes.AddDynamicLogging, whatever);

export const pixieDynamicLogging = (request: PixieDynamicLoggingRequest) => async dispatch => {
	return HostApi.instance.send(PixieDynamicLoggingRequestType, request);
};
