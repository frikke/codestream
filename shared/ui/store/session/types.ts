import { SessionState as _SessionState } from "codestream-common/webview-protocol-common";
export type SessionState = _SessionState;

export enum SessionActionType {
	Set = "@session/SetSession",
	SetMaintenanceMode = "@session/SetMaintenanceMode",
	SetEligibleJoinCompanies = "@session/SetEligibleJoinCompanies",
	SetTOS = "@session/SetTOS",
}
