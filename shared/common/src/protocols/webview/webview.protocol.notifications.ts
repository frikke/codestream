import { NotificationType } from "vscode-jsonrpc";
import { IpcRoutes, WebviewContext } from "./webview.protocol.common";

export interface WebviewDidInitializeNotification {}

export const WebviewDidInitializeNotificationType = new NotificationType<
	WebviewDidInitializeNotification,
	void
>(`${IpcRoutes.Host}/didInitialize`);

export interface WebviewDidChangeContextNotification {
	context: WebviewContext;
}
export const WebviewDidChangeContextNotificationType = new NotificationType<
	WebviewDidChangeContextNotification,
	void
>(`${IpcRoutes.Host}/context/didChange`);
