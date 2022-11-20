import { RequestType } from "vscode-jsonrpc";
import { IpcRoutes } from "./webview.protocol.common";

export interface LiveShareInviteToSessionRequest {
	userId: string;
	createNewStream: boolean;
}

export interface LiveShareInviteToSessionResponse {}

export const LiveShareInviteToSessionRequestType = new RequestType<
	LiveShareInviteToSessionRequest,
	LiveShareInviteToSessionResponse,
	void,
	void
>(`${IpcRoutes.Host}/vsls/invite`);

export interface LiveShareJoinSessionRequest {
	url: string;
}

export interface LiveShareJoinSessionResponse {}

export const LiveShareJoinSessionRequestType = new RequestType<
	LiveShareJoinSessionRequest,
	LiveShareJoinSessionResponse,
	void,
	void
>(`${IpcRoutes.Host}/vsls/join`);

export interface LiveShareStartSessionRequest {
	streamId: string;
	threadId: string;
	createNewStream: boolean;
}

export interface LiveShareStartSessionResponse {}

export const LiveShareStartSessionRequestType = new RequestType<
	LiveShareStartSessionRequest,
	LiveShareStartSessionResponse,
	void,
	void
>(`${IpcRoutes.Host}/vsls/start`);
