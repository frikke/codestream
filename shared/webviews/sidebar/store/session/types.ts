import { SessionState as _SessionState } from "../../ipc/sidebar.protocol.common";
export type SessionState = _SessionState;

export enum SessionActionType {
	Set = "@session/SetSession",
	SetMaintenanceMode = "@session/SetMaintenanceMode",
	SetTOS = "@session/SetTOS",
}
